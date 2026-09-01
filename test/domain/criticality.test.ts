import { describe, expect, it } from "vitest";
import { calculateVulnerabilityCriticality } from "../../src/domain/criticality.js";
import type { Detection, Evidence } from "../../src/domain/model.js";
import { productDefaults } from "../../src/domain/policy.js";

function detection(
  severity: Detection["severity"] = "high",
): Detection {
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
    severity,
    evidence: [
      {
        kind: "detector",
        source: "trivy",
        observedAt: "2026-08-31T00:00:00.000Z",
        subject: "package",
        value: "lodash@4.17.21",
      },
    ],
  };
}

describe("calculateVulnerabilityCriticality", () => {
  it("maps relevant KEV to Critical", () => {
    const result = calculateVulnerabilityCriticality(
      detection("medium"),
      [
        {
          kind: "kev",
          source: "cisa-kev",
          observedAt: "2026-08-31T00:00:00.000Z",
          subject: "CVE-2026-0001",
          value: true,
          url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        },
      ],
      productDefaults,
    );
    expect(result.calculated).toBe("critical");
    expect(result.reasons[0]).toMatch(/KEV/i);
  });

  it("maps CVSS Critical without KEV to High", () => {
    const result = calculateVulnerabilityCriticality(
      detection("critical"),
      [],
      productDefaults,
    );
    expect(result.calculated).toBe("high");
    expect(result.reasons.some((reason) => /not lowered/i.test(reason))).toBe(
      true,
    );
  });

  it("allows EPSS to raise one band when threshold is enabled", () => {
    const result = calculateVulnerabilityCriticality(
      detection("medium"),
      [
        {
          kind: "epss",
          source: "first-epss",
          observedAt: "2026-08-31T00:00:00.000Z",
          subject: "CVE-2026-0001",
          value: 0.97,
        },
      ],
      {
        vulnerability: { epssRaiseThreshold: 0.9 },
      },
    );
    expect(result.calculated).toBe("high");
  });

  it("never lowers when KEV or EPSS enrichment is missing", () => {
    const withNullThreshold = calculateVulnerabilityCriticality(
      detection("high"),
      [],
      productDefaults,
    );
    expect(withNullThreshold.calculated).toBe("high");

    const withThresholdButNoEpss = calculateVulnerabilityCriticality(
      detection("high"),
      [],
      { vulnerability: { epssRaiseThreshold: 0.5 } },
    );
    expect(withThresholdButNoEpss.calculated).toBe("high");
  });

  it("records exact repository exposure adjustment reasons", () => {
    const exposure: Evidence = {
      kind: "repository",
      source: "internet-facing-service",
      observedAt: "2026-08-31T00:00:00.000Z",
      subject: "exposure-adjustment",
      value: "raise",
    };
    const result = calculateVulnerabilityCriticality(
      detection("medium"),
      [exposure],
      productDefaults,
    );
    expect(result.calculated).toBe("high");
    expect(
      result.reasons.some((reason) =>
        reason.includes("internet-facing-service"),
      ),
    ).toBe(true);
  });
});
