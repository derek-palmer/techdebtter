import type {
  AnalysisReport,
  Detection,
  Evidence,
  OperatingScope,
} from "../domain/model.js";
import type {
  Clock,
  Detector,
  EnrichmentProvider,
  RepositorySource,
} from "../domain/ports.js";
import { PrerequisiteError } from "../adapters/errors.js";
import {
  productDefaults,
  resolvePolicy,
  type OrganizationPolicy,
  type PolicyLayerState,
  type RepositoryPolicy,
} from "../domain/policy.js";
import { triage } from "../domain/triage.js";
import { withReportHash } from "./report-hash.js";

export interface AnalyzeDependencies {
  repositorySource: RepositorySource;
  detectors: Detector[];
  enrichmentProviders: EnrichmentProvider[];
  readOrganizationPolicy: (
    organization: string,
  ) => Promise<PolicyLayerState<OrganizationPolicy>>;
  readRepositoryPolicy: (
    localPath: string,
  ) => Promise<PolicyLayerState<RepositoryPolicy>>;
  clock: Clock;
}

export async function analyze(
  scope: OperatingScope,
  dependencies: AnalyzeDependencies,
): Promise<AnalysisReport> {
  const snapshot = await dependencies.repositorySource.snapshot(scope);

  if (snapshot.dirty && !scope.includeUncommitted) {
    throw new PrerequisiteError(
      "dirty-worktree",
      "Working tree has uncommitted changes; commit or pass --include-uncommitted",
    );
  }

  const organizationPolicy = await dependencies.readOrganizationPolicy(
    snapshot.owner,
  );
  const repositoryPolicy = await dependencies.readRepositoryPolicy(
    scope.localPath,
  );
  const effectivePolicy = resolvePolicy(
    productDefaults,
    organizationPolicy,
    repositoryPolicy,
  );

  const warnings: string[] = [];
  if (!effectivePolicy.organizationVerified) {
    warnings.push(
      "Organization policy could not be verified; publication and autonomous remediation remain blocked",
    );
  }

  const enabledDetectorIds = new Set(effectivePolicy.detectors.enabled);
  const detections: Detection[] = [];
  for (const detector of dependencies.detectors) {
    if (!enabledDetectorIds.has(detector.id)) {
      continue;
    }
    detections.push(
      ...(await detector.detect(snapshot, scope.localPath)),
    );
  }

  const enrichmentByVulnerability = new Map<string, Evidence[]>();
  for (const provider of dependencies.enrichmentProviders) {
    const enrichment = await provider.enrich(detections);
    warnings.push(...enrichment.warnings);
    mergeEnrichment(enrichmentByVulnerability, enrichment.evidenceByVulnerability);
  }

  const generatedAt = dependencies.clock.now().toISOString();
  const findings = triage(detections, {
    snapshot,
    policy: effectivePolicy,
    enrichmentByVulnerability,
    generatedAt,
  });

  return withReportHash({
    schemaVersion: "1.0.0",
    generatedAt,
    reproducible: !snapshot.dirty,
    snapshot,
    policy: {
      verified: effectivePolicy.organizationVerified,
      sources: effectivePolicy.sources,
    },
    findings,
    warnings,
  });
}

function mergeEnrichment(
  target: Map<string, Evidence[]>,
  incoming: Map<string, Evidence[]>,
): void {
  for (const [vulnerabilityId, evidence] of incoming) {
    const existing = target.get(vulnerabilityId) ?? [];
    target.set(vulnerabilityId, [...existing, ...evidence]);
  }
}

export function assertAnalyzeIsReadOnly(
  dependencies: AnalyzeDependencies,
): void {
  const gatewayCandidate = dependencies as AnalyzeDependencies & {
    reconcileFinding?: unknown;
  };
  if (typeof gatewayCandidate.reconcileFinding === "function") {
    throw new Error("Analyze dependencies must not expose GitHub write methods");
  }
}
