import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  filterDiscoveredRepositories,
  runBotPublish,
  runBotRemediate,
} from "../../src/application/bot.js";
import { withReportHash } from "../../src/application/report-hash.js";
import type { AnalysisReport, Finding } from "../../src/domain/model.js";
import type { GitHubGateway } from "../../src/domain/ports.js";
import type { RemediationGateway } from "../../src/domain/remediation.js";

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
};

describe("filterDiscoveredRepositories", () => {
  it("keeps organization repositories and drops .github and exclusions", () => {
    const filtered = filterDiscoveredRepositories(
      [
        {
          owner: "acme",
          name: "api",
          fullName: "acme/api",
          private: true,
        },
        {
          owner: "acme",
          name: ".github",
          fullName: "acme/.github",
          private: true,
        },
        {
          owner: "acme",
          name: "docs",
          fullName: "acme/docs",
          private: false,
        },
        {
          owner: "other",
          name: "api",
          fullName: "other/api",
          private: true,
        },
      ],
      {
        organization: "acme",
        exclusions: ["docs"],
      },
    );

    expect(filtered.map((repo) => repo.fullName)).toEqual(["acme/api"]);
  });
});

describe("runBotPublish", () => {
  it("publishes only unattended-eligible selections", async () => {
    const report = makeReport([
      finding,
      {
        ...finding,
        selectionId: "mediumfind01",
        effectiveCriticality: "medium",
        calculatedCriticality: "medium",
      },
    ]);
    const gateway = createGateway();

    const result = await runBotPublish(
      report,
      {
        organization: "acme",
        repositories: ["api"],
        localPath: "/tmp/repo",
        includeUncommitted: false,
      },
      { gateway },
      {
        organization: { state: "absent" },
        repository: { state: "absent" },
      },
    );

    expect(result.selected).toEqual(["abc123def456"]);
    expect(vi.mocked(gateway.reconcileFinding)).toHaveBeenCalledOnce();
  });
});

describe("runBotRemediate", () => {
  it("returns unsupported when remediation is disabled by defaults", async () => {
    const report = makeReport([
      {
        ...finding,
        packageEcosystem: "npm",
        packageName: "lodash",
        installedVersion: "4.17.21",
        fixedVersions: ["4.17.22"],
        target: "package-lock.json",
      },
    ]);

    const result = await runBotRemediate(
      report,
      {
        organization: "acme",
        repositories: ["api"],
        localPath: "/tmp/repo",
        includeUncommitted: false,
      },
      {
        gateway: createRemediationGateway(),
        clock: { now: () => new Date("2026-09-07T00:00:00.000Z") },
      },
      {
        organization: { state: "absent" },
        repository: { state: "absent" },
      },
    );

    expect(result.selected).toBeUndefined();
    expect(result.result.status).toBe("unsupported");
  });

  it("opens a draft when org policy enables remediation", async () => {
    const root = await mkdtemp(join(tmpdir(), "techdebtter-bot-remediate-"));
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

    const report = makeReport([
      {
        ...finding,
        packageEcosystem: "npm",
        packageName: "lodash",
        installedVersion: "4.17.21",
        fixedVersions: ["4.17.22"],
        target: "package-lock.json",
      },
    ]);
    const gateway = createRemediationGateway();

    const result = await runBotRemediate(
      report,
      {
        organization: "acme",
        repositories: ["api"],
        localPath: root,
        includeUncommitted: false,
      },
      {
        gateway,
        clock: { now: () => new Date("2026-09-07T00:00:00.000Z") },
      },
      {
        organization: {
          state: "present",
          value: { defaults: { remediation: { enabled: true } } },
        },
        repository: { state: "absent" },
      },
    );

    expect(result.selected).toBe("abc123def456");
    expect(result.result.status).toBe("created");
    expect(gateway.createDraftPullRequest).toHaveBeenCalledOnce();
  });
});

function createGateway(): GitHubGateway {
  return {
    readOrganizationPolicy: vi.fn(),
    readRepositoryPolicy: vi.fn(),
    reconcileFinding: vi.fn(async (_snapshot, selected) => ({
      selectionId: selected.selectionId,
      issueNumber: 7,
      issueUrl: "https://github.com/acme/api/issues/7",
      action: "created" as const,
    })),
  };
}

function createRemediationGateway(): RemediationGateway {
  return {
    listOpenRemediationPullRequests: vi.fn(async () => []),
    getPullRequest: vi.fn(),
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
    markPullRequestReady: vi.fn(),
  };
}

function makeReport(findings: Finding[]): AnalysisReport {
  return withReportHash({
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-31T12:00:00.000Z",
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
