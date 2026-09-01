import { describe, expect, it } from "vitest";
import type { Detection, Evidence } from "../../src/domain/model.js";
import { productDefaults, resolvePolicy } from "../../src/domain/policy.js";
import { triage } from "../../src/domain/triage.js";

function baseDetection(overrides: Partial<Detection> = {}): Detection {
  return {
    fingerprint: "det-lodash-cve",
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
        source: "trivy",
        observedAt: "2026-08-31T00:00:00.000Z",
        subject: "package",
        value: "lodash@4.17.21",
      },
    ],
    ...overrides,
  };
}

const snapshot = {
  owner: "acme",
  repo: "api",
  commitSha: "a".repeat(40),
  dirty: false,
};

const policy = resolvePolicy(
  productDefaults,
  { state: "absent" },
  { state: "absent" },
);

describe("triage", () => {
  it("converges equivalent detections into one Finding", () => {
    const first = baseDetection({
      fingerprint: "det-a",
      target: "package-lock.json",
    });
    const second = baseDetection({
      fingerprint: "det-b",
      detector: "trivy-vulnerability",
      target: "node_modules/lodash/package.json",
      evidence: [
        {
          kind: "detector",
          source: "trivy",
          observedAt: "2026-08-31T00:00:00.000Z",
          subject: "package",
          value: "lodash@4.17.21",
        },
        {
          kind: "repository",
          source: "lockfile",
          observedAt: "2026-08-31T00:00:00.000Z",
          subject: "path",
          value: "node_modules/lodash/package.json",
        },
      ],
    });

    const findings = triage([first, second], {
      snapshot,
      policy,
      enrichmentByVulnerability: new Map(),
      generatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.detectionFingerprints).toEqual(
      expect.arrayContaining(["det-a", "det-b"]),
    );
    expect(finding.evidence.length).toBeGreaterThanOrEqual(2);
    expect(finding.route).toBe("ready-for-agent");
    expect(finding.selectionId).toBe(finding.fingerprint.slice(0, 12));
  });

  it("routes incomplete evidence to needs-info", () => {
    const incomplete = baseDetection({ evidence: [] });
    const findings = triage([incomplete], {
      snapshot,
      policy,
      enrichmentByVulnerability: new Map(),
      generatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.route).toBe("needs-info");
  });

  it("keeps enrichment Evidence on the Finding without starting remediation", () => {
    const enrichment: Evidence[] = [
      {
        kind: "kev",
        source: "cisa-kev",
        observedAt: "2026-08-31T00:00:00.000Z",
        subject: "CVE-2026-0001",
        value: true,
      },
    ];
    const findings = triage([baseDetection()], {
      snapshot,
      policy,
      enrichmentByVulnerability: new Map([["CVE-2026-0001", enrichment]]),
      generatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(findings[0]!.effectiveCriticality).toBe("critical");
    expect(findings[0]!.route).toBe("ready-for-agent");
    expect(findings[0]!.evidence.some((item) => item.kind === "kev")).toBe(
      true,
    );
  });
});
