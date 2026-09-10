import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalyzeDependencies } from "../../src/application/analyze.js";
import { LocalGitRepositorySource } from "../../src/adapters/git.js";
import { execProcessRunner, type ProcessRunner } from "../../src/adapters/process.js";
import type { Detection } from "../../src/domain/model.js";
import type { GitHubGateway } from "../../src/domain/ports.js";
import {
  EXIT_INVALID,
  EXIT_PREREQUISITE,
  EXIT_SUCCESS,
} from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";

// NFR2.2: a dirty worktree is rejected by default; --include-uncommitted
// analyzes it anyway but marks the report non-reproducible; publish then
// refuses that non-reproducible report. Uses a disposable local scratch Git
// repo (git init in a temp dir) as the interim substitute for the FR6
// fixture repository, per security-design.md's Test Harness Notes.

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("dirty worktree handling (NFR2.2)", () => {
  it("rejects a dirty worktree by default with a structured dirty-worktree error", async () => {
    const repoPath = await createDirtyTempRepo();
    const captured = captureIo();

    const exitCode = await runCli(
      ["node", "techdebtter", "analyze", repoPath],
      { dependencies: createAnalyzeDependencies(), io: captured.io },
    );

    expect(exitCode).toBe(EXIT_PREREQUISITE);
    expect(captured.stdout).toBe("");
    expect(JSON.parse(captured.stderr)).toMatchObject({
      code: "dirty-worktree",
    });
  });

  it("marks a report non-reproducible when analyzed with --include-uncommitted, and publish refuses it", async () => {
    const repoPath = await createDirtyTempRepo();
    const dir = await mkdtemp(join(tmpdir(), "techdebtter-dirty-report-"));
    tempDirs.push(dir);
    const reportPath = join(dir, "report.json");

    const analyzeCaptured = captureIo();
    const analyzeExitCode = await runCli(
      [
        "node",
        "techdebtter",
        "analyze",
        repoPath,
        "--include-uncommitted",
        "--format",
        "json",
        "--output",
        reportPath,
      ],
      { dependencies: createAnalyzeDependencies(), io: analyzeCaptured.io },
    );

    expect(analyzeExitCode).toBe(EXIT_SUCCESS);
    const report = JSON.parse(await readFile(reportPath, "utf8")) as {
      reproducible: boolean;
      findings: Array<{ selectionId: string }>;
    };
    expect(report.reproducible).toBe(false);
    expect(report.findings).toHaveLength(1);

    const publishCaptured = captureIo();
    const publishExitCode = await runCli(
      [
        "node",
        "techdebtter",
        "publish",
        reportPath,
        "--select",
        report.findings[0]!.selectionId,
        "--yes",
      ],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway: createGateway() },
        io: publishCaptured.io,
      },
    );

    expect(publishExitCode).toBe(EXIT_INVALID);
    expect(JSON.parse(publishCaptured.stderr)).toMatchObject({
      code: "non-reproducible",
    });
  });
});

function createAnalyzeDependencies(): AnalyzeDependencies {
  return {
    repositorySource: new LocalGitRepositorySource(execProcessRunner),
    detectors: [
      {
        id: "trivy-vulnerability",
        async detect(): Promise<Detection[]> {
          return [baseDetection()];
        },
      },
    ],
    enrichmentProviders: [],
    readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    readRepositoryPolicy: async () => ({ state: "absent" }),
    clock: { now: () => new Date("2026-08-31T12:00:00.000Z") },
  };
}

function createGateway(): GitHubGateway {
  return {
    async readOrganizationPolicy() {
      return { state: "absent" };
    },
    async reconcileFinding() {
      throw new Error("Not expected to be called in this test");
    },
  } as unknown as GitHubGateway;
}

function baseDetection(): Detection {
  return {
    fingerprint: "det-1",
    detector: "trivy-vulnerability",
    detectorVersion: "0.60.0",
    class: "vulnerability",
    packageEcosystem: "npm",
    packageName: "lodash",
    installedVersion: "4.17.21",
    fixedVersions: ["4.17.22"],
    vulnerabilityIds: ["CVE-2026-0001"],
    target: "package-lock.json",
    severity: "high",
    evidence: [
      {
        kind: "detector",
        source: "trivy-vulnerability",
        observedAt: "2026-08-31T12:00:00.000Z",
        subject: "raw-result",
        value: "fixture-hash",
      },
    ],
  };
}

async function createDirtyTempRepo(): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), "techdebtter-dirty-repo-"));
  tempDirs.push(repoPath);

  await runGit(repoPath, ["init"]);
  await runGit(repoPath, ["config", "user.email", "techdebtter@example.com"]);
  await runGit(repoPath, ["config", "user.name", "TechDebtter"]);
  await writeFile(join(repoPath, "README.md"), "# test\n", "utf8");
  await runGit(repoPath, ["add", "README.md"]);
  await runGit(repoPath, ["commit", "-m", "init"]);
  await runGit(repoPath, [
    "remote",
    "add",
    "origin",
    "git@github.com:Acme/Api.git",
  ]);

  await writeFile(join(repoPath, "uncommitted.txt"), "pending\n", "utf8");

  return repoPath;
}

async function runGit(cwd: string, args: string[]): Promise<void> {
  const runner: ProcessRunner = execProcessRunner;
  const result = await runner.run("git", args, { cwd });
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

function captureIo(): {
  stdout: string;
  stderr: string;
  io: { stdout: Writable; stderr: Writable };
} {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  return {
    get stdout() {
      return stdoutChunks.join("");
    },
    get stderr() {
      return stderrChunks.join("");
    },
    io: {
      stdout: createWritable(stdoutChunks),
      stderr: createWritable(stderrChunks),
    },
  };
}

function createWritable(chunks: string[]): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
}
