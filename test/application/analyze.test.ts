import { describe, expect, it, vi } from "vitest";
import { analyze, assertAnalyzeIsReadOnly, type AnalyzeDependencies } from "../../src/application/analyze.js";
import { computeReportHash } from "../../src/application/report-hash.js";
import type {
  Detection,
  OperatingScope,
  RepositorySnapshot,
} from "../../src/domain/model.js";
import type { OrganizationPolicy, PolicyLayerState, RepositoryPolicy } from "../../src/domain/policy.js";

const snapshot: RepositorySnapshot = {
  owner: "acme",
  repo: "api",
  commitSha: "a".repeat(40),
  dirty: false,
};

const scope: OperatingScope = {
  organization: "acme",
  repositories: ["api"],
  localPath: "/tmp/repo",
  includeUncommitted: false,
};

describe("analyze", () => {
  it("orchestrates snapshot, policy, detection, enrichment, and triage in order", async () => {
    const order: string[] = [];
    const detection = baseDetection();
    const dependencies = createDependencies({
      onSnapshot: () => order.push("snapshot"),
      onOrganizationPolicy: () => order.push("organization-policy"),
      onRepositoryPolicy: () => order.push("repository-policy"),
      onDetect: () => order.push("detect"),
      onEnrich: () => order.push("enrich"),
      detections: [detection],
    });

    assertAnalyzeIsReadOnly(dependencies);
    const report = await analyze(scope, dependencies);

    expect(order).toEqual([
      "snapshot",
      "organization-policy",
      "repository-policy",
      "detect",
      "enrich",
    ]);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.selectionId).toHaveLength(12);
    expect(report.reportHash).toBe(
      computeReportHash({
        schemaVersion: report.schemaVersion,
        generatedAt: report.generatedAt,
        reproducible: report.reproducible,
        snapshot: report.snapshot,
        policy: report.policy,
        findings: report.findings,
        warnings: report.warnings,
      }),
    );
  });

  it("refuses dirty snapshots unless includeUncommitted is set", async () => {
    const dependencies = createDependencies({
      snapshot: { ...snapshot, dirty: true },
    });

    await expect(analyze(scope, dependencies)).rejects.toMatchObject({
      code: "dirty-worktree",
    });
  });

  it("marks non-reproducible reports when includeUncommitted is enabled", async () => {
    const dependencies = createDependencies({
      snapshot: { ...snapshot, dirty: true },
    });

    const report = await analyze(
      { ...scope, includeUncommitted: true },
      dependencies,
    );

    expect(report.reproducible).toBe(false);
  });

  it("adds a warning when organization policy is unverifiable", async () => {
    const dependencies = createDependencies({
      organizationPolicy: { state: "unverifiable" },
    });

    const report = await analyze(scope, dependencies);

    expect(report.policy.verified).toBe(false);
    expect(report.warnings.some((warning) => /organization policy/i.test(warning))).toBe(
      true,
    );
  });
});

function createDependencies(options: {
  snapshot?: RepositorySnapshot;
  detections?: Detection[];
  organizationPolicy?: PolicyLayerState<OrganizationPolicy>;
  onSnapshot?: () => void;
  onOrganizationPolicy?: () => void;
  onRepositoryPolicy?: () => void;
  onDetect?: () => void;
  onEnrich?: () => void;
}): AnalyzeDependencies {
  const resolvedSnapshot = options.snapshot ?? snapshot;
  const detections = options.detections ?? [baseDetection()];

  return {
    repositorySource: {
      async snapshot() {
        options.onSnapshot?.();
        return resolvedSnapshot;
      },
    },
    detectors: [
      {
        id: "trivy-vulnerability",
        async detect() {
          options.onDetect?.();
          return detections;
        },
      },
    ],
    enrichmentProviders: [
      {
        id: "cisa-kev",
        async enrich() {
          options.onEnrich?.();
          return { evidenceByVulnerability: new Map(), warnings: [] };
        },
      },
    ],
    readOrganizationPolicy: vi.fn(
      async (): Promise<PolicyLayerState<OrganizationPolicy>> => {
        options.onOrganizationPolicy?.();
        return (
          options.organizationPolicy ?? {
            state: "absent",
          }
        );
      },
    ),
    readRepositoryPolicy: vi.fn(
      async (): Promise<PolicyLayerState<RepositoryPolicy>> => {
        options.onRepositoryPolicy?.();
        return { state: "absent" };
      },
    ),
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
