import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EXIT_SUCCESS } from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";
import { withReportHash } from "../../src/application/report-hash.js";
import type { AnalysisReport, Finding } from "../../src/domain/model.js";
import type { RemediationGateway } from "../../src/domain/remediation.js";
import { captureIo } from "./helpers.js";

describe("runCli remediate", () => {
  it("opens a draft remediation PR for an explicit selection", async () => {
    const root = await mkdtemp(join(tmpdir(), "techdebtter-remediate-cli-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          name: "fixture-app",
          version: "1.0.0",
          dependencies: { lodash: "4.17.21" },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(root, "package-lock.json"),
      JSON.stringify(
        {
          name: "fixture-app",
          version: "1.0.0",
          lockfileVersion: 3,
          packages: {
            "": {
              name: "fixture-app",
              version: "1.0.0",
              dependencies: { lodash: "4.17.21" },
            },
            "node_modules/lodash": { version: "4.17.21" },
          },
        },
        null,
        2,
      ),
    );

    const report = makeReport();
    const reportPath = join(root, "report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const gateway = createGateway();
    const captured = captureIo();
    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "remediate",
        reportPath,
        "--select",
        report.findings[0]!.selectionId,
        "--path",
        root,
        "--yes",
        "--format",
        "json",
      ],
      {
        dependencies: {
          repositorySource: {
            async snapshot() {
              return report.snapshot;
            },
          },
          detectors: [],
          enrichmentProviders: [],
          readOrganizationPolicy: async () => ({ state: "absent" }),
          readRepositoryPolicy: async () => ({ state: "absent" }),
          clock: { now: () => new Date("2026-09-07T00:00:00.000Z") },
        },
        remediateDependencies: {
          gateway,
          policyLayers: {
            organization: { state: "absent" },
            repository: {
              state: "present",
              value: { remediation: { enabled: true } },
            },
          },
          baseBranch: "main",
        },
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    const result = JSON.parse(captured.stdout) as { status: string };
    expect(result.status).toBe("created");
    expect(vi.mocked(gateway.createDraftPullRequest)).toHaveBeenCalledOnce();
  });
});

function createGateway(): RemediationGateway {
  return {
    listOpenRemediationPullRequests: vi.fn(async () => []),
    getPullRequest: vi.fn(async () => ({
      number: 11,
      url: "https://github.com/acme/api/pull/11",
      draft: true,
      headSha: "c".repeat(40),
      title: "Upgrade lodash",
      createdAt: "2026-09-07T00:00:00.000Z",
      labels: ["techdebtter"],
    })),
    createDraftPullRequest: vi.fn(async () => ({
      number: 11,
      url: "https://github.com/acme/api/pull/11",
      draft: true,
      headSha: "c".repeat(40),
      title: "Upgrade lodash",
      createdAt: "2026-09-07T00:00:00.000Z",
      labels: ["techdebtter"],
    })),
    listCheckRuns: vi.fn(async () => []),
    markPullRequestReady: vi.fn(async () => ({
      number: 11,
      url: "https://github.com/acme/api/pull/11",
      draft: false,
      headSha: "c".repeat(40),
      title: "Upgrade lodash",
      createdAt: "2026-09-07T00:00:00.000Z",
      labels: ["techdebtter"],
    })),
  };
}

function makeReport(): AnalysisReport {
  const finding: Finding = {
    selectionId: "abc123def456",
    fingerprint: "f".repeat(64),
    detectionFingerprints: ["det-1"],
    class: "vulnerability",
    title: "lodash@4.17.21: CVE-2026-0001",
    calculatedCriticality: "critical",
    effectiveCriticality: "critical",
    criticalityReasons: ["CISA KEV"],
    route: "ready-for-agent",
    evidence: [
      {
        kind: "detector",
        source: "trivy-vulnerability",
        observedAt: "2026-09-07T00:00:00.000Z",
        subject: "raw-result",
        value: "fixture-hash",
      },
    ],
    packageEcosystem: "npm",
    packageName: "lodash",
    installedVersion: "4.17.21",
    fixedVersions: ["4.17.22"],
    target: "package-lock.json",
  };

  return withReportHash({
    schemaVersion: "1.0.0",
    generatedAt: "2026-09-07T00:00:00.000Z",
    reproducible: true,
    snapshot: {
      owner: "acme",
      repo: "api",
      commitSha: "a".repeat(40),
      dirty: false,
    },
    policy: {
      verified: true,
      sources: ["product-defaults", "organization-absent", "repository-absent"],
    },
    findings: [finding],
    warnings: [],
  });
}
