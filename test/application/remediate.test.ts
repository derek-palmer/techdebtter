import { describe, expect, it, vi } from "vitest";
import {
  observeRemediationPullRequest,
  remediate,
} from "../../src/application/remediate.js";
import {
  evaluateRemediationBudget,
  selectRequiredCheckOutcome,
  type RemediationGateway,
  type Remediator,
} from "../../src/domain/remediation.js";
import type { Finding } from "../../src/domain/model.js";
import { productDefaults, type EffectivePolicy } from "../../src/domain/policy.js";

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
      observedAt: "2026-08-31T12:00:00.000Z",
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

const snapshot = {
  owner: "acme",
  repo: "api",
  commitSha: "a".repeat(40),
  dirty: false,
};

const scope = {
  organization: "acme",
  repositories: ["api"],
  localPath: "/tmp/repo",
  includeUncommitted: false,
};

describe("evaluateRemediationBudget", () => {
  it("blocks when an open remediation PR already exists", () => {
    const budget = evaluateRemediationBudget(
      {
        remediation: {
          ...productDefaults.remediation,
          enabled: true,
          allowed: true,
        },
      },
      [
        {
          number: 1,
          url: "https://github.com/acme/api/pull/1",
          draft: true,
          headSha: "b".repeat(40),
          title: "Upgrade lodash",
          createdAt: "2026-08-31T00:00:00.000Z",
          labels: ["techdebtter"],
        },
      ],
      new Date("2026-08-31T12:00:00.000Z"),
    );

    expect(budget.available).toBe(false);
    expect(budget.reasons[0]).toMatch(/budget exhausted/i);
  });
});

describe("selectRequiredCheckOutcome", () => {
  it("returns missing when no required checks exist", () => {
    expect(selectRequiredCheckOutcome([])).toBe("missing");
  });

  it("returns passed only when all required checks succeeded", () => {
    expect(
      selectRequiredCheckOutcome([
        {
          name: "check",
          status: "completed",
          conclusion: "success",
          required: true,
        },
      ]),
    ).toBe("passed");
  });
});

describe("remediate", () => {
  it("creates a draft pull request when budget allows", async () => {
    const remediator: Remediator = {
      id: "npm-package-lock",
      supports: () => true,
      plan: vi.fn(async () => ({
        findingFingerprint: finding.fingerprint,
        selectionId: finding.selectionId,
        summary: "Upgrade lodash to 4.17.22",
        mutations: [
          {
            path: "package.json",
            previousContent: "{}",
            nextContent: '{"dependencies":{"lodash":"4.17.22"}}',
          },
        ],
        validation: {
          kind: "static" as const,
          commands: ["npm test"],
          notes: ["static only"],
        },
        rollback: {
          summary: "restore",
          mutations: [],
        },
      })),
    };
    const gateway = createGateway();

    const result = await remediate(finding, scope, snapshot, {
      remediators: [remediator],
      gateway,
      policy: {
        ...basePolicy(),
        remediation: {
          ...productDefaults.remediation,
          enabled: true,
          allowed: true,
        },
      },
      clock: { now: () => new Date("2026-08-31T12:00:00.000Z") },
    });

    expect(result.status).toBe("created");
    expect(result.pullRequest?.draft).toBe(true);
    expect(gateway.createDraftPullRequest).toHaveBeenCalledOnce();
  });

  it("keeps failed required checks in draft without repair", async () => {
    const gateway = createGateway({
      listCheckRuns: vi.fn(async () => [
        {
          name: "check",
          status: "completed" as const,
          conclusion: "failure" as const,
          required: true,
        },
      ]),
    });

    const result = await observeRemediationPullRequest(
      snapshot,
      9,
      "c".repeat(40),
      gateway,
      {
        remediation: {
          ...productDefaults.remediation,
          enabled: true,
          allowed: true,
        },
      },
    );

    expect(result.status).toBe("failed-ci");
    expect(gateway.markPullRequestReady).not.toHaveBeenCalled();
  });
});

function createGateway(
  overrides: Partial<RemediationGateway> = {},
): RemediationGateway {
  return {
    listOpenRemediationPullRequests: vi.fn(async () => []),
    createDraftPullRequest: vi.fn(async () => ({
      number: 9,
      url: "https://github.com/acme/api/pull/9",
      draft: true,
      headSha: "c".repeat(40),
      title: "Upgrade lodash",
      createdAt: "2026-08-31T12:00:00.000Z",
      labels: ["techdebtter"],
    })),
    listCheckRuns: vi.fn(async () => []),
    markPullRequestReady: vi.fn(async () => ({
      number: 9,
      url: "https://github.com/acme/api/pull/9",
      draft: false,
      headSha: "c".repeat(40),
      title: "Upgrade lodash",
      createdAt: "2026-08-31T12:00:00.000Z",
      labels: ["techdebtter"],
    })),
    ...overrides,
  };
}

function basePolicy(): EffectivePolicy {
  return {
    detectors: { enabled: ["trivy-vulnerability"] },
    scan: productDefaults.scan,
    publication: { ...productDefaults.publication, allowed: true },
    vulnerability: productDefaults.vulnerability,
    remediation: { ...productDefaults.remediation, allowed: true },
    ai: productDefaults.ai,
    scope: { exclusions: [] },
    labels: {},
    organizationVerified: true,
    sources: ["product-defaults", "organization-absent", "repository-absent"],
  };
}
