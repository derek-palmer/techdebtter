import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyzeDependencies } from "../../src/application/analyze.js";
import { createAnalysisReportValidator } from "../../src/application/report-schema.js";
import type {
  Detection,
  Evidence,
  PublicationResult,
  RepositorySnapshot,
} from "../../src/domain/model.js";
import type { GitHubGateway } from "../../src/domain/ports.js";
import { EXIT_SUCCESS } from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";
import { captureIo } from "./helpers.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("local analyze-to-issue tracer", () => {
  it("analyzes, publishes once, and reconciles on the second publish", async () => {
    const dir = await mkdtemp(join(tmpdir(), "techdebtter-tracer-"));
    tempDirs.push(dir);
    const reportPath = join(dir, "report.json");
    const gateway = createTrackingGateway();
    const dependencies = createTracerAnalyzeDependencies();
    const captured = captureIo();

    const analyzeExit = await runCli(
      [
        "node",
        "techdebtter",
        "analyze",
        ".",
        "--format",
        "json",
        "--output",
        reportPath,
      ],
      {
        dependencies,
        io: captured.io,
      },
    );

    expect(analyzeExit).toBe(EXIT_SUCCESS);
    const report = JSON.parse(await readFile(reportPath, "utf8")) as {
      findings: Array<{ selectionId: string }>;
      policy: { verified: boolean };
    };
    expect(createAnalysisReportValidator()(report)).toBe(true);
    expect(report.policy.verified).toBe(true);
    expect(report.findings).toHaveLength(1);

    const selectionId = report.findings[0]!.selectionId;
    const publishArgs = [
      "node",
      "techdebtter",
      "publish",
      reportPath,
      "--select",
      selectionId,
      "--yes",
      "--format",
      "json",
    ] as const;

    const firstPublishExit = await runCli([...publishArgs], {
      dependencies,
      publishDependencies: { gateway },
      io: captureIo().io,
    });
    expect(firstPublishExit).toBe(EXIT_SUCCESS);

    const secondPublishExit = await runCli([...publishArgs], {
      dependencies,
      publishDependencies: { gateway },
      io: captureIo().io,
    });
    expect(secondPublishExit).toBe(EXIT_SUCCESS);

    expect(vi.mocked(gateway.reconcileFinding)).toHaveBeenCalledTimes(2);
    expect(gateway.invocations[0]?.action).toBe("created");
    expect(gateway.invocations[1]?.action).toBe("updated");
    expect(gateway.invocations[0]?.issueNumber).toBe(gateway.invocations[1]?.issueNumber);
  });
});

function createTrackingGateway(): GitHubGateway & {
  invocations: PublicationResult["published"];
} {
  const invocations: PublicationResult["published"] = [];
  const reconcileFinding = vi.fn(async (_snapshot, finding) => {
    const entry =
      invocations.length === 0
        ? publishedEntry(finding.selectionId, 101, "created")
        : {
            ...invocations[0]!,
            action: "updated" as const,
          };
    invocations.push(entry);
    return entry;
  });

  return {
    readOrganizationPolicy: vi.fn(),
    readRepositoryPolicy: vi.fn(),
    reconcileFinding,
    invocations,
  };
}

function createTracerAnalyzeDependencies(): AnalyzeDependencies {
  const snapshot: RepositorySnapshot = {
    owner: "acme",
    repo: "api",
    commitSha: "a".repeat(40),
    dirty: false,
  };

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
          return [baseDetection()];
        },
      },
    ],
    enrichmentProviders: [
      {
        id: "cisa-kev",
        async enrich() {
          return { evidenceByVulnerability: new Map<string, Evidence[]>(), warnings: [] };
        },
      },
    ],
    readOrganizationPolicy: async () => ({ state: "absent" }),
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

function publishedEntry(
  selectionId: string,
  issueNumber: number,
  action: PublicationResult["published"][number]["action"],
): PublicationResult["published"][number] {
  return {
    selectionId,
    issueNumber,
    issueUrl: `https://github.com/acme/api/issues/${issueNumber}`,
    action,
  };
}
