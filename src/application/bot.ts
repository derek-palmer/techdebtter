import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AnalyzeDependencies } from "./analyze.js";
import { analyze } from "./analyze.js";
import type { PublishDependencies } from "./publish.js";
import { publish } from "./publish.js";
import {
  selectUnattendedFindings,
  selectionIds,
} from "./unattended-select.js";
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
