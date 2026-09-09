import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AnalyzeDependencies } from "./analyze.js";
import { analyze } from "./analyze.js";
import type { PublishDependencies } from "./publish.js";
import { publish } from "./publish.js";
import {
  selectUnattendedFindings,
  selectUnattendedRemediationFinding,
  selectionIds,
} from "./unattended-select.js";
import {
  remediate,
  type RemediateDependencies,
  type RemediationResult,
} from "./remediate.js";
import type {
  AnalysisReport,
  OperatingScope,
  PublicationResult,
} from "../domain/model.js";
import {
  productDefaults,
  resolvePolicy,
  type OrganizationPolicy,
  type PolicyLayerState,
  type RepositoryPolicy,
} from "../domain/policy.js";
import type { InstallationRepository } from "../adapters/github-app-auth.js";
import { createDefaultRemediators } from "../adapters/remediators.js";

export interface DiscoverResult {
  organization: string;
  repositories: InstallationRepository[];
}

export interface BotAnalyzeResult {
  report: AnalysisReport;
  reportPath?: string;
}

export interface BotPublishResult {
  selected: string[];
  result: PublicationResult;
}

export interface BotRemediateResult {
  selected?: string;
  result: RemediationResult;
}

export function filterDiscoveredRepositories(
  repositories: InstallationRepository[],
  options: {
    organization: string;
    include?: string[];
    exclusions?: string[];
  },
): InstallationRepository[] {
  const organization = options.organization.toLowerCase();
  const include = new Set((options.include ?? []).map((name) => name.toLowerCase()));
  const exclusions = new Set(
    (options.exclusions ?? []).map((name) => name.toLowerCase()),
  );

  return repositories.filter((repository) => {
    if (repository.owner.toLowerCase() !== organization) {
      return false;
    }
    if (repository.name === ".github") {
      return false;
    }
    if (exclusions.has(repository.name.toLowerCase())) {
      return false;
    }
    if (include.size > 0 && !include.has(repository.name.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export async function runBotAnalyze(
  scope: OperatingScope,
  dependencies: AnalyzeDependencies,
  options?: { reportPath?: string },
): Promise<BotAnalyzeResult> {
  const report = await analyze(scope, dependencies);
  if (options?.reportPath) {
    const reportPath = resolve(options.reportPath);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return { report, reportPath };
  }
  return { report };
}

export async function runBotPublish(
  report: AnalysisReport,
  scope: OperatingScope,
  dependencies: PublishDependencies,
  policyLayers: {
    organization: PolicyLayerState<OrganizationPolicy>;
    repository: PolicyLayerState<RepositoryPolicy>;
  },
): Promise<BotPublishResult> {
  const policy = resolvePolicy(
    productDefaults,
    policyLayers.organization,
    policyLayers.repository,
  );
  const selectedFindings = selectUnattendedFindings(report, policy);
  const selected = selectionIds(selectedFindings);

  if (selected.length === 0) {
    return {
      selected,
      result: { published: [], warnings: report.warnings },
    };
  }

  const result = await publish(report, selected, scope, dependencies);
  return { selected, result };
}

/**
 * Unattended remediation: pick the highest-Criticality eligible Finding
 * (or an explicit selection) and open at most one draft PR within budget.
 */
export async function runBotRemediate(
  report: AnalysisReport,
  scope: OperatingScope,
  dependencies: Pick<RemediateDependencies, "gateway" | "clock"> & {
    baseBranch?: string;
  },
  policyLayers: {
    organization: PolicyLayerState<OrganizationPolicy>;
    repository: PolicyLayerState<RepositoryPolicy>;
  },
  options?: { selectionId?: string },
): Promise<BotRemediateResult> {
  const policy = resolvePolicy(
    productDefaults,
    policyLayers.organization,
    policyLayers.repository,
  );
  const remediators = createDefaultRemediators();

  const finding = options?.selectionId
    ? report.findings.find((entry) => entry.selectionId === options.selectionId)
    : selectUnattendedRemediationFinding(report, policy, remediators);

  if (!finding) {
    return {
      result: {
        status: "unsupported",
        warnings: options?.selectionId
          ? [`Unknown selection ID: ${options.selectionId}`]
          : [
              "No ready-for-agent Finding eligible for unattended remediation",
            ],
      },
    };
  }

  if (!report.reproducible || !report.policy.verified) {
    return {
      selected: finding.selectionId,
      result: {
        status: "unsupported",
        warnings: [
          !report.reproducible
            ? "Non-reproducible reports cannot be remediated"
            : "Organization policy is unverifiable; remediation is blocked",
        ],
      },
    };
  }

  const result = await remediate(finding, scope, report.snapshot, {
    remediators,
    gateway: dependencies.gateway,
    policy,
    clock: dependencies.clock,
    ...(dependencies.baseBranch ? { baseBranch: dependencies.baseBranch } : {}),
  });

  return { selected: finding.selectionId, result };
}
