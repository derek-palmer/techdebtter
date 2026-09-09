import { describe, expect, it, vi } from "vitest";
import { EXIT_SUCCESS } from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";
import { withReportHash } from "../../src/application/report-hash.js";
import type { AnalysisReport } from "../../src/domain/model.js";
import type { FindingVerificationGateway } from "../../src/domain/ports.js";
import type { RemediationGateway } from "../../src/domain/remediation.js";
import { captureIo, writeReportFixture } from "./helpers.js";

describe("runCli observe and verify", () => {
  it("observe promotes a draft PR when required checks passed", async () => {
    const gateway: RemediationGateway = {
      listOpenRemediationPullRequests: vi.fn(async () => []),
      getPullRequest: vi.fn(async () => ({
        number: 9,
        url: "https://github.com/acme/api/pull/9",
        draft: true,
        headSha: "c".repeat(40),
        title: "Upgrade lodash",
        createdAt: "2026-09-07T00:00:00.000Z",
        labels: ["techdebtter"],
      })),
      createDraftPullRequest: vi.fn(),
      listCheckRuns: vi.fn(async () => [
        {
          name: "check",
          status: "completed" as const,
          conclusion: "success" as const,
          required: true,
        },
      ]),
      markPullRequestReady: vi.fn(async () => ({
        number: 9,
        url: "https://github.com/acme/api/pull/9",
        draft: false,
        headSha: "c".repeat(40),
        title: "Upgrade lodash",
        createdAt: "2026-09-07T00:00:00.000Z",
        labels: ["techdebtter"],
      })),
    };

    const captured = captureIo();
    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "observe",
        "--owner",
        "acme",
        "--repo",
        "api",
        "--pull",
        "9",
        "--format",
        "json",
      ],
      {
        dependencies: {
          repositorySource: {
            async snapshot() {
              return {
                owner: "acme",
                repo: "api",
                commitSha: "a".repeat(40),
                dirty: false,
              };
            },
          },
          detectors: [],
          enrichmentProviders: [],
          readOrganizationPolicy: async () => ({ state: "absent" }),
          readRepositoryPolicy: async () => ({ state: "absent" }),
          clock: { now: () => new Date("2026-09-07T00:00:00.000Z") },
        },
        observeGateway: gateway,
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    const result = JSON.parse(captured.stdout) as { status: string };
    expect(result.status).toBe("promoted");
    expect(gateway.markPullRequestReady).toHaveBeenCalledOnce();
  });

  it("observe without --pull scans all open remediation PRs", async () => {
    const gateway: RemediationGateway = {
      listOpenRemediationPullRequests: vi.fn(async () => [
        {
          number: 9,
          url: "https://github.com/acme/api/pull/9",
          draft: true,
          headSha: "c".repeat(40),
          title: "Upgrade lodash",
          createdAt: "2026-09-07T00:00:00.000Z",
          labels: ["techdebtter"],
        },
      ]),
      getPullRequest: vi.fn(),
      createDraftPullRequest: vi.fn(),
      listCheckRuns: vi.fn(async () => [
        {
          name: "check",
          status: "completed" as const,
          conclusion: "success" as const,
          required: true,
        },
      ]),
      markPullRequestReady: vi.fn(async () => ({
        number: 9,
        url: "https://github.com/acme/api/pull/9",
        draft: false,
        headSha: "c".repeat(40),
        title: "Upgrade lodash",
        createdAt: "2026-09-07T00:00:00.000Z",
        labels: ["techdebtter"],
      })),
    };

    const captured = captureIo();
    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "observe",
        "--owner",
        "acme",
        "--repo",
        "api",
        "--format",
        "json",
      ],
      {
        dependencies: {
          repositorySource: {
            async snapshot() {
              return {
                owner: "acme",
                repo: "api",
                commitSha: "a".repeat(40),
                dirty: false,
              };
            },
          },
          detectors: [],
          enrichmentProviders: [],
          readOrganizationPolicy: async () => ({ state: "absent" }),
          readRepositoryPolicy: async () => ({ state: "absent" }),
          clock: { now: () => new Date("2026-09-07T00:00:00.000Z") },
        },
        observeGateway: gateway,
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    const batch = JSON.parse(captured.stdout) as {
      results: Array<{ result: { status: string } }>;
    };
    expect(batch.results).toHaveLength(1);
    expect(batch.results[0]?.result.status).toBe("promoted");
  });

  it("verify closes Finding Issues absent from the report", async () => {
    const report = withReportHash({
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
      findings: [],
      warnings: [],
    } satisfies AnalysisReport);
    const reportPath = writeReportFixture(report);

    const gateway: FindingVerificationGateway = {
      listOpenFindingIssues: vi.fn(async () => [
        {
          issueNumber: 7,
          issueUrl: "https://github.com/acme/api/issues/7",
          findingFingerprint: "f".repeat(64),
        },
      ]),
      closeIssueAsRemediated: vi.fn(async () => ({
        issueNumber: 7,
        issueUrl: "https://github.com/acme/api/issues/7",
      })),
    };

    const captured = captureIo();
    const exitCode = await runCli(
      ["node", "techdebtter", "verify", reportPath, "--format", "json"],
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
        verifyGateway: gateway,
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    const result = JSON.parse(captured.stdout) as {
      closed: Array<{ issueNumber: number }>;
    };
    expect(result.closed).toEqual([{ issueNumber: 7, issueUrl: expect.any(String), findingFingerprint: "f".repeat(64) }]);
    expect(gateway.closeIssueAsRemediated).toHaveBeenCalledOnce();
  });
});
