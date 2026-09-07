import type { AnalysisReport, Finding } from "../domain/model.js";
import {
  productDefaults,
  resolvePolicy,
  type OrganizationPolicy,
  type PolicyLayerState,
  type RepositoryPolicy,
} from "../domain/policy.js";
import { createDefaultRemediators } from "../adapters/remediators.js";
import {
  remediate,
  type RemediateDependencies,
  type RemediationResult,
} from "./remediate.js";
import { RemediationError } from "./remediation-error.js";

export interface RunRemediateFromReportOptions {
  report: AnalysisReport;
  selectionId: string;
  localPath: string;
  gateway: RemediateDependencies["gateway"];
  policyLayers: {
    organization: PolicyLayerState<OrganizationPolicy>;
    repository: PolicyLayerState<RepositoryPolicy>;
  };
  baseBranch?: string;
  clock?: { now: () => Date };
}

export async function runRemediateFromReport(
  options: RunRemediateFromReportOptions,
): Promise<{ finding: Finding; result: RemediationResult }> {
  if (!options.report.reproducible) {
    throw new RemediationError(
      "unsupported-finding",
      "Non-reproducible reports cannot be remediated; commit changes and reanalyze",
    );
  }
  if (!options.report.policy.verified) {
    throw new RemediationError(
      "unsupported-finding",
      "Organization policy is unverifiable; remediation is blocked",
    );
  }

  const finding = options.report.findings.find(
    (entry) => entry.selectionId === options.selectionId,
  );
  if (!finding) {
    throw new RemediationError(
      "unsupported-finding",
      `Unknown selection ID: ${options.selectionId}`,
    );
  }

  const policy = resolvePolicy(
    productDefaults,
    options.policyLayers.organization,
    options.policyLayers.repository,
  );

  const result = await remediate(
    finding,
    {
      organization: options.report.snapshot.owner,
      repositories: [options.report.snapshot.repo],
      localPath: options.localPath,
      includeUncommitted: false,
    },
    options.report.snapshot,
    {
      remediators: createDefaultRemediators(),
      gateway: options.gateway,
      policy,
      clock: options.clock ?? { now: () => new Date() },
      ...(options.baseBranch ? { baseBranch: options.baseBranch } : {}),
    },
  );

  return { finding, result };
}
