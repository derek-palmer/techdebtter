import { describe, expect, it } from "vitest";
import { withReportHash } from "../../src/application/report-hash.js";
import {
  selectUnattendedFindings,
  selectUnattendedRemediationFinding,
  selectionIds,
} from "../../src/application/unattended-select.js";
import type { AnalysisReport, Finding } from "../../src/domain/model.js";
import type { EffectivePolicy } from "../../src/domain/policy.js";
import type { Remediator } from "../../src/domain/remediation.js";

const baseFinding: Finding = {
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

describe("selectUnattendedFindings", () => {
  it("selects evidence-verified Critical and High vulnerabilities by default", () => {
    const report = makeReport([
      baseFinding,
      {
        ...baseFinding,
        selectionId: "highfinding01",
        effectiveCriticality: "high",
        calculatedCriticality: "high",
      },
      {
        ...baseFinding,
        selectionId: "mediumfind01",
        effectiveCriticality: "medium",
        calculatedCriticality: "medium",
      },
      {
        ...baseFinding,
        selectionId: "debtfinding01",
        class: "debt",
        effectiveCriticality: "critical",
        calculatedCriticality: "critical",
      },
    ]);

    const selected = selectUnattendedFindings(report, allowedPolicy("high"));
    expect(selectionIds(selected)).toEqual(["abc123def456", "highfinding01"]);
  });

  it("returns no selections when publication is blocked", () => {
    const report = makeReport([baseFinding]);
    const selected = selectUnattendedFindings(report, {
      publication: {
        unattendedMinimumCriticality: "high",
        allowed: false,
      },
    });
    expect(selected).toEqual([]);
  });

  it("returns no selections for non-reproducible or unverified reports", () => {
    const dirty = makeReport([baseFinding], {
      reproducible: false,
      verified: true,
    });
    const unverified = makeReport([baseFinding], {
      reproducible: true,
      verified: false,
    });

    expect(selectUnattendedFindings(dirty, allowedPolicy("high"))).toEqual([]);
    expect(selectUnattendedFindings(unverified, allowedPolicy("high"))).toEqual(
      [],
    );
  });

  it("skips findings without evidence", () => {
    const report = makeReport([
      {
        ...baseFinding,
        evidence: [],
      },
    ]);
    expect(selectUnattendedFindings(report, allowedPolicy("high"))).toEqual([]);
  });
});

describe("selectUnattendedRemediationFinding", () => {
  const supportingRemediator: Remediator = {
    id: "fixture-remediator",
    supports: (finding) => finding.packageName === "lodash",
    plan: async () => {
      throw new Error("not used");
    },
  };

  it("picks the highest-Criticality ready-for-agent Finding with a Remediator", () => {
    const report = makeReport([
      {
        ...baseFinding,
        selectionId: "highfinding01",
        effectiveCriticality: "high",
        calculatedCriticality: "high",
      },
      baseFinding,
    ]);

    const selected = selectUnattendedRemediationFinding(
      report,
      remediationPolicy(true),
      [supportingRemediator],
    );
    expect(selected?.selectionId).toBe("abc123def456");
  });

  it("returns undefined when remediation is disabled", () => {
    const report = makeReport([baseFinding]);
    expect(
      selectUnattendedRemediationFinding(report, remediationPolicy(false), [
        supportingRemediator,
      ]),
    ).toBeUndefined();
  });

  it("skips Findings without a supporting Remediator", () => {
    const report = makeReport([baseFinding]);
    const none: Remediator = {
      id: "none",
      supports: () => false,
      plan: async () => {
        throw new Error("not used");
      },
    };
    expect(
      selectUnattendedRemediationFinding(report, remediationPolicy(true), [none]),
    ).toBeUndefined();
  });
});

function allowedPolicy(
  minimum: EffectivePolicy["publication"]["unattendedMinimumCriticality"],
): Pick<EffectivePolicy, "publication"> {
  return {
    publication: {
      unattendedMinimumCriticality: minimum,
      allowed: true,
    },
  };
}

function remediationPolicy(
  enabled: boolean,
): Pick<EffectivePolicy, "publication" | "remediation"> {
  return {
    publication: {
      unattendedMinimumCriticality: "high",
      allowed: true,
    },
    remediation: {
      enabled,
      allowed: true,
      maxOpenPullRequests: 1,
      minHoursBetweenPullRequests: 24,
      allowStaticOnlyPromotion: false,
    },
  };
}

function makeReport(
  findings: Finding[],
  options?: { reproducible?: boolean; verified?: boolean },
): AnalysisReport {
  return withReportHash({
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-31T12:00:00.000Z",
    reproducible: options?.reproducible ?? true,
    snapshot: {
      owner: "acme",
      repo: "api",
      commitSha: "a".repeat(40),
      dirty: !(options?.reproducible ?? true),
    },
    policy: {
      verified: options?.verified ?? true,
      sources: ["product-defaults", "organization-absent", "repository-absent"],
    },
    findings,
    warnings: [],
  });
}
