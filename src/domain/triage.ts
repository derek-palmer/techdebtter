import { calculateVulnerabilityCriticality } from "./criticality.js";
import {
  detectionFingerprint,
  findingFingerprint,
} from "./fingerprint.js";
import type {
  Criticality,
  Detection,
  Evidence,
  Finding,
  RepositorySnapshot,
} from "./model.js";
import type { EffectivePolicy } from "./policy.js";

export interface TriageContext {
  snapshot: RepositorySnapshot;
  policy: EffectivePolicy;
  enrichmentByVulnerability: Map<string, Evidence[]>;
  generatedAt: string;
}

const criticalityRank: Record<Criticality, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function triage(
  detections: Detection[],
  context: TriageContext,
): Finding[] {
  const groups = new Map<
    string,
    {
      fingerprint: string;
      detections: Detection[];
      evidence: Evidence[];
      detectionFingerprints: string[];
    }
  >();

  for (const detection of detections) {
    const fingerprint = findingFingerprint({
      owner: context.snapshot.owner,
      repo: context.snapshot.repo,
      packageEcosystem: detection.packageEcosystem,
      packageName: detection.packageName,
      vulnerabilityIds: detection.vulnerabilityIds,
      fixedVersions: detection.fixedVersions,
    });
    const detectionFp =
      detection.fingerprint ||
      detectionFingerprint({
        detector: detection.detector,
        owner: context.snapshot.owner,
        repo: context.snapshot.repo,
        packageEcosystem: detection.packageEcosystem,
        packageName: detection.packageName,
        installedVersion: detection.installedVersion,
        vulnerabilityIds: detection.vulnerabilityIds,
        target: detection.target,
      });

    const existing = groups.get(fingerprint);
    if (existing) {
      existing.detections.push(detection);
      existing.detectionFingerprints.push(detectionFp);
      existing.evidence.push(...detection.evidence);
    } else {
      groups.set(fingerprint, {
        fingerprint,
        detections: [detection],
        detectionFingerprints: [detectionFp],
        evidence: [...detection.evidence],
      });
    }
  }

  const findings: Finding[] = [];
  for (const group of groups.values()) {
    const primary = group.detections[0];
    if (!primary) {
      continue;
    }

    const enrichment = collectEnrichment(
      primary.vulnerabilityIds,
      context.enrichmentByVulnerability,
    );
    const allEvidence = uniqueEvidence([...group.evidence, ...enrichment]);
    const criticality = calculateVulnerabilityCriticality(
      primary,
      enrichment,
      context.policy,
    );

    const hasConcreteEvidence = allEvidence.some(
      (item) => item.kind === "detector" || item.kind === "repository",
    );

    findings.push({
      selectionId: group.fingerprint.slice(0, 12),
      fingerprint: group.fingerprint,
      detectionFingerprints: uniqueStable(group.detectionFingerprints),
      class: primary.class,
      title: buildTitle(primary),
      calculatedCriticality: criticality.calculated,
      effectiveCriticality: criticality.calculated,
      criticalityReasons: criticality.reasons,
      route: hasConcreteEvidence ? "ready-for-agent" : "needs-info",
      evidence: allEvidence,
    });
  }

  return findings.sort((left, right) => {
    const rank =
      criticalityRank[left.effectiveCriticality] -
      criticalityRank[right.effectiveCriticality];
    if (rank !== 0) {
      return rank;
    }
    return left.fingerprint.localeCompare(right.fingerprint);
  });
}

function collectEnrichment(
  vulnerabilityIds: string[],
  enrichmentByVulnerability: Map<string, Evidence[]>,
): Evidence[] {
  const evidence: Evidence[] = [];
  for (const vulnerabilityId of vulnerabilityIds) {
    const items = enrichmentByVulnerability.get(vulnerabilityId);
    if (!items) {
      continue;
    }
    evidence.push(...items);
  }
  return evidence;
}

function buildTitle(detection: Detection): string {
  const ids = detection.vulnerabilityIds.join(", ");
  return `${detection.packageName}@${detection.installedVersion}: ${ids}`;
}

function uniqueStable(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function uniqueEvidence(evidence: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  const result: Evidence[] = [];
  for (const item of evidence) {
    const key = JSON.stringify(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}
