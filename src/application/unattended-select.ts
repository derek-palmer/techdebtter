import type {
  AnalysisReport,
  Criticality,
  Finding,
} from "../domain/model.js";
import type { EffectivePolicy } from "../domain/policy.js";

const criticalityRank: Record<Criticality, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Select Findings eligible for unattended Bot publication.
 * Defaults to evidence-bearing Vulnerability Findings at or above the
 * policy unattendedCriticality floor (Critical/High). Publication must
 * also be allowed by verified Organization Policy.
 */
export function selectUnattendedFindings(
  report: AnalysisReport,
  policy: Pick<EffectivePolicy, "publication">,
): Finding[] {
  if (!policy.publication.allowed) {
    return [];
  }
  if (!report.reproducible || !report.policy.verified) {
    return [];
  }

  const minimumRank = criticalityRank[policy.publication.unattendedMinimumCriticality];

  return report.findings.filter((finding) => {
    if (finding.class !== "vulnerability") {
      return false;
    }
    if (finding.evidence.length === 0) {
      return false;
    }
    return criticalityRank[finding.effectiveCriticality] <= minimumRank;
  });
}

export function selectionIds(findings: Finding[]): string[] {
  return findings.map((finding) => finding.selectionId);
}
