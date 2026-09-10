import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyze,
  assertAnalyzeIsReadOnly,
  type AnalyzeDependencies,
} from "../../src/application/analyze.js";
import { LocalGitRepositorySource } from "../../src/adapters/git.js";
import { execProcessRunner, type ProcessRunner } from "../../src/adapters/process.js";
import type { Detection, OperatingScope } from "../../src/domain/model.js";

// NFR2.1: analyze must never mutate the working tree and must never issue a
// GitHub write call. AnalyzeDependencies (per src/application/analyze.ts)
// exposes no GitHub gateway at all — repositorySource, detectors,
// enrichmentProviders, readOrganizationPolicy, readRepositoryPolicy, clock —
// so there is no write-capable method available to `analyze` to call in the
// first place. This suite asserts both the structural absence of any write
// path and the runtime absence of any working-tree change.

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("analyze — no-mutation invariant (NFR2.1)", () => {
  it("produces zero working-tree diff across an analyze() run", async () => {
    const repoPath = await createTempRepo();
    const beforeContents = await readFile(join(repoPath, "README.md"), "utf8");
    const beforeStatus = await gitStatusPorcelain(repoPath);

    const dependencies = createStubDependencies();
    const scope: OperatingScope = {
      organization: "acme",
      repositories: ["api"],
      localPath: repoPath,
      includeUncommitted: false,
    };

    assertAnalyzeIsReadOnly(dependencies);
    await analyze(scope, dependencies);

    const afterContents = await readFile(join(repoPath, "README.md"), "utf8");
    const afterStatus = await gitStatusPorcelain(repoPath);

    expect(afterContents).toBe(beforeContents);
    expect(afterStatus).toBe(beforeStatus);
    expect(afterStatus).toBe("");
  });

  it("exposes zero write-scoped GitHub call surface on the constructed dependency set", () => {
    const dependencies = createStubDependencies();
    const candidate = dependencies as AnalyzeDependencies & {
      reconcileFinding?: unknown;
      gateway?: unknown;
      createIssue?: unknown;
    };

    expect(() => assertAnalyzeIsReadOnly(dependencies)).not.toThrow();
    expect(candidate.reconcileFinding).toBeUndefined();
    expect(candidate.gateway).toBeUndefined();
    expect(candidate.createIssue).toBeUndefined();
  });
});

function createStubDependencies(): AnalyzeDependencies {
  return {
    repositorySource: new LocalGitRepositorySource(execProcessRunner),
    detectors: [
      {
        id: "trivy-vulnerability",
        async detect(): Promise<Detection[]> {
          return [];
        },
      },
    ],
    enrichmentProviders: [],
    readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    readRepositoryPolicy: async () => ({ state: "absent" }),
    clock: { now: () => new Date("2026-08-31T12:00:00.000Z") },
  };
}

async function createTempRepo(): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), "techdebtter-no-mutation-"));
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

  return repoPath;
}

async function gitStatusPorcelain(repoPath: string): Promise<string> {
  const runner: ProcessRunner = execProcessRunner;
  const result = await runner.run("git", ["status", "--porcelain"], {
    cwd: repoPath,
  });
  return result.stdout.trim();
}

async function runGit(cwd: string, args: string[]): Promise<void> {
  const runner: ProcessRunner = execProcessRunner;
  const result = await runner.run("git", args, { cwd });
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}
