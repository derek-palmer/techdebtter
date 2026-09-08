import { describe, expect, it, vi } from "vitest";
import {
  observeAndPromote,
  observeOpenRemediationPullRequests,
  verifyRemediatedFindings,
} from "../../src/application/verify.js";
import { withReportHash } from "../../src/application/report-hash.js";
import type { AnalysisReport } from "../../src/domain/model.js";
import type { FindingVerificationGateway } from "../../src/domain/ports.js";
import type { RemediationGateway } from "../../src/domain/remediation.js";
import { productDefaults } from "../../src/domain/policy.js";

describe("verifyRemediatedFindings", () => {
  it("closes open Finding Issues absent from the latest report", async () => {
    const report = makeReport([]);
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

    const result = await verifyRemediatedFindings(report, gateway);
    expect(result.closed).toHaveLength(1);
    expect(result.remaining).toHaveLength(0);
    expect(gateway.closeIssueAsRemediated).toHaveBeenCalledOnce();
  });

  it("leaves issues open when the Finding remains", async () => {
    const fingerprint = "f".repeat(64);
    const report = makeReport([
      {
        selectionId: "abc123def456",
        fingerprint,
        detectionFingerprints: ["det-1"],
        class: "vulnerability",
        title: "still present",
        calculatedCriticality: "high",
        effectiveCriticality: "high",
        criticalityReasons: ["fixture"],
        route: "ready-for-agent",
        evidence: [
          {
            kind: "detector",
            source: "trivy-vulnerability",
            observedAt: "2026-09-07T00:00:00.000Z",
            subject: "raw",
            value: "hash",
          },
        ],
      },
    ]);
    const gateway: FindingVerificationGateway = {
      listOpenFindingIssues: vi.fn(async () => [
        {
          issueNumber: 7,
          issueUrl: "https://github.com/acme/api/issues/7",
          findingFingerprint: fingerprint,
        },
      ]),
      closeIssueAsRemediated: vi.fn(),
    };

    const result = await verifyRemediatedFindings(report, gateway);
    expect(result.closed).toHaveLength(0);
    expect(result.remaining).toHaveLength(1);
    expect(gateway.closeIssueAsRemediated).not.toHaveBeenCalled();
  });
});

describe("observeAndPromote", () => {
  it("promotes a draft when required checks passed", async () => {
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

    const result = await observeAndPromote(
      {
        owner: "acme",
        repo: "api",
        commitSha: "a".repeat(40),
        dirty: false,
      },
      9,
      gateway,
      {
        remediation: {
          ...productDefaults.remediation,
          enabled: true,
          allowed: true,
        },
      },
    );

    expect(result.status).toBe("promoted");
    expect(gateway.markPullRequestReady).toHaveBeenCalledOnce();
  });
});

describe("observeOpenRemediationPullRequests", () => {
  it("observes every open draft remediation PR", async () => {
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

    const batch = await observeOpenRemediationPullRequests(
      {
        owner: "acme",
        repo: "api",
        commitSha: "a".repeat(40),
        dirty: false,
      },
      gateway,
      {
        remediation: {
          ...productDefaults.remediation,
          enabled: true,
          allowed: true,
        },
      },
    );

    expect(batch.results).toHaveLength(1);
    expect(batch.results[0]?.result.status).toBe("promoted");
  });
});

function makeReport(
  findings: AnalysisReport["findings"],
): AnalysisReport {
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
    findings,
    warnings: [],
  });
}
