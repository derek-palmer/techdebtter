import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalyzeDependencies } from "../../src/application/analyze.js";
import { createAnalysisReportValidator } from "../../src/application/report-schema.js";
import type {
  Detection,
  Evidence,
  RepositorySnapshot,
} from "../../src/domain/model.js";
import {
  EXIT_FAIL_ON,
  EXIT_PREREQUISITE,
  EXIT_SUCCESS,
} from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/reports/v1.json",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("runCli analyze", () => {
  it("writes terminal output by default and exits 0", async () => {
    const captured = captureIo();
    const exitCode = await runCli(["node", "techdebtter", "analyze", "."], {
      dependencies: createAnalyzeDependencies(),
      io: captured.io,
    });

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(captured.stdout).toContain("TechDebtter Analysis Report");
    expect(captured.stdout).toContain("lodash@4.17.21");
  });

  it("emits schema-valid JSON on stdout for --format json", async () => {
    const captured = captureIo();
    const exitCode = await runCli(
      ["node", "techdebtter", "analyze", ".", "--format", "json"],
      {
        dependencies: createAnalyzeDependencies(),
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    const report = JSON.parse(captured.stdout) as unknown;
    expect(createAnalysisReportValidator()(report)).toBe(true);
  });

  it("writes markdown output to --output without touching stdout", async () => {
    const dir = await mkdtemp(join(tmpdir(), "techdebtter-cli-out-"));
    tempDirs.push(dir);
    const outputPath = join(dir, "report.md");
    const captured = captureIo();

    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "analyze",
        ".",
        "--format",
        "markdown",
        "--output",
        outputPath,
      ],
      {
        dependencies: createAnalyzeDependencies(),
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(captured.stdout).toBe("");
    const written = await readFile(outputPath, "utf8");
    expect(written).toContain("# TechDebtter Analysis Report");
  });

  it("returns fail-on exit code when threshold is met", async () => {
    const captured = captureIo();
    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "analyze",
        ".",
        "--format",
        "json",
        "--fail-on",
        "high",
      ],
      {
        dependencies: createAnalyzeDependencies({
          enrichment: [
            {
              kind: "kev",
              source: "cisa-kev",
              observedAt: "2026-08-31T12:00:00.000Z",
              subject: "CVE-2026-0001",
              value: true,
            },
          ],
        }),
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_FAIL_ON);
  });

  it("writes structured stderr without partial JSON stdout on prerequisite failure", async () => {
    const captured = captureIo();
    const exitCode = await runCli(["node", "techdebtter", "analyze", "."], {
      dependencies: createAnalyzeDependencies({
        snapshot: {
          owner: "acme",
          repo: "api",
          commitSha: "a".repeat(40),
          dirty: true,
        },
      }),
      io: captured.io,
    });

    expect(exitCode).toBe(EXIT_PREREQUISITE);
    expect(captured.stdout).toBe("");
    expect(JSON.parse(captured.stderr)).toMatchObject({
      code: "dirty-worktree",
    });
  });
});

describe("analysis report fixture", () => {
  it("validates the committed v1 fixture", () => {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    expect(createAnalysisReportValidator()(fixture)).toBe(true);
  });
});

function createAnalyzeDependencies(options?: {
  snapshot?: RepositorySnapshot;
  detections?: Detection[];
  enrichment?: Evidence[];
}): AnalyzeDependencies {
  const snapshot =
    options?.snapshot ??
    ({
      owner: "acme",
      repo: "api",
      commitSha: "a".repeat(40),
      dirty: false,
    } satisfies RepositorySnapshot);
  const detections = options?.detections ?? [baseDetection()];

  return {
    repositorySource: {
      async snapshot() {
        return snapshot;
      },
    },
    detectors: [
      {
        id: "trivy-vulnerability",
        async detect() {
          return detections;
        },
      },
    ],
    enrichmentProviders: [
      {
        id: "cisa-kev",
        async enrich() {
          const evidence = options?.enrichment ?? [];
          return {
            evidenceByVulnerability: new Map(
              evidence.length > 0 ? [["CVE-2026-0001", evidence]] : [],
            ),
            warnings: [],
          };
        },
      },
    ],
    readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    readRepositoryPolicy: async () => ({ state: "absent" }),
    clock: {
      now: () => new Date("2026-08-31T12:00:00.000Z"),
    },
  };
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
