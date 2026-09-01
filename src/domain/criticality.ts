import type { Criticality, Detection, Evidence } from "./model.js";
import type { EffectivePolicy } from "./policy.js";

export interface CriticalityResult {
  calculated: Criticality;
  reasons: string[];
}

const severityBaseline: Record<Detection["severity"], Criticality> = {
  critical: "high",
  high: "high",
  medium: "medium",
  low: "low",
  negligible: "low",
  unknown: "low",
};

const raiseOneBand: Record<Criticality, Criticality> = {
  low: "medium",
  medium: "high",
  high: "critical",
  critical: "critical",
};

export function calculateVulnerabilityCriticality(
  detection: Detection,
  enrichment: Evidence[],
  policy: Pick<EffectivePolicy, "vulnerability">,
): CriticalityResult {
  const reasons: string[] = [];
  const kevEvidence = enrichment.filter((item) => item.kind === "kev");
  const epssEvidence = enrichment.filter((item) => item.kind === "epss");
  const exposureEvidence = enrichment.filter(
    (item) =>
      item.kind === "repository" && item.subject === "exposure-adjustment",
  );

  const relevantKev = kevEvidence.find(
    (item) => item.value === true || item.value === "true",
  );
  if (relevantKev) {
    reasons.push(
      `CISA KEV confirms relevant exploitation evidence from ${relevantKev.source}`,
    );
    return { calculated: "critical", reasons };
  }

  const baseline = severityBaseline[detection.severity];
  reasons.push(
    `Authoritative severity ${detection.severity} maps to ${baseline} without confirmed KEV`,
  );

  let calculated = baseline;
  const threshold = policy.vulnerability.epssRaiseThreshold;
  if (threshold !== null) {
    const epssScore = highestEpss(epssEvidence);
    if (epssScore !== undefined && epssScore >= threshold) {
      const raised = raiseOneBand[calculated];
      if (raised !== calculated) {
        reasons.push(
          `EPSS ${epssScore} meets threshold ${threshold} and raises one band to ${raised}`,
        );
        calculated = raised;
      } else {
        reasons.push(
          `EPSS ${epssScore} meets threshold ${threshold} but ${calculated} cannot raise further`,
        );
      }
    } else if (epssScore === undefined) {
      reasons.push("EPSS enrichment unavailable; Criticality not lowered");
    } else {
      reasons.push(
        `EPSS ${epssScore} is below threshold ${threshold}; no band raise`,
      );
    }
  } else if (epssEvidence.length === 0) {
    reasons.push("EPSS promotion disabled; missing EPSS never lowers Criticality");
  }

  for (const exposure of exposureEvidence) {
    const direction = String(exposure.value);
    if (direction === "raise") {
      const raised = raiseOneBand[calculated];
      reasons.push(
        `Repository exposure Evidence raises Criticality to ${raised}: ${exposure.source}`,
      );
      calculated = raised;
    } else if (direction === "lower") {
      // Missing or negative enrichment must never lower; only explicit exposure can explain a drop.
      const lowered = lowerOneBand(calculated);
      reasons.push(
        `Repository exposure Evidence lowers Criticality to ${lowered}: ${exposure.source}`,
      );
      calculated = lowered;
    } else {
      reasons.push(
        `Repository exposure Evidence recorded without band change: ${exposure.source}`,
      );
    }
  }

  if (kevEvidence.length === 0) {
    reasons.push("KEV enrichment unavailable; Criticality not lowered");
  }

  return { calculated, reasons };
}

function highestEpss(evidence: Evidence[]): number | undefined {
  let highest: number | undefined;
  for (const item of evidence) {
    const score =
      typeof item.value === "number" ? item.value : Number(item.value);
    if (!Number.isFinite(score)) {
      continue;
    }
    if (highest === undefined || score > highest) {
      highest = score;
    }
  }
  return highest;
}

function lowerOneBand(criticality: Criticality): Criticality {
  switch (criticality) {
    case "critical":
      return "high";
    case "high":
      return "medium";
    case "medium":
      return "low";
    case "low":
      return "low";
    default: {
      const _exhaustive: never = criticality;
      return _exhaustive;
    }
  }
}
