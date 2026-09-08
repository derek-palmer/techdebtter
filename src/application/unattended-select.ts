import type {
  AnalysisReport,
  Criticality,
  Finding,
} from "../domain/model.js";
import type { EffectivePolicy } from "../domain/policy.js";
import type { Remediator } from "../domain/remediation.js";

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

/**
 * Choose the single highest-Criticality Finding eligible for unattended
 * remediation (V30). Publication-floor Findings that are `ready-for-agent`
 * and supported by a Remediator win; budget is enforced later by `remediate`.
 */
export function selectUnattendedRemediationFinding(
  report: AnalysisReport,
  policy: Pick<EffectivePolicy, "publication" | "remediation">,
  remediators: Remediator[],
): Finding | undefined {
  if (!policy.remediation.allowed || !policy.remediation.enabled) {
    return undefined;
  }

  const candidates = selectUnattendedFindings(report, policy)
    .filter((finding) => finding.route === "ready-for-agent")
    .filter((finding) =>
      remediators.some((remediator) => remediator.supports(finding)),
    )
    .sort(
      (left, right) =>
        criticalityRank[left.effectiveCriticality] -
        criticalityRank[right.effectiveCriticality],
    );

  return candidates[0];
}

export function selectionIds(findings: Finding[]): string[] {
  return findings.map((finding) => finding.selectionId);
}
