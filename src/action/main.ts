import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import {
  createInstallationOctokit,
  createInstallationToken,
  listInstallationRepositories,
  permissionsForPhase,
  type BotPhase,
  type GitHubAppCredentials,
} from "../adapters/github-app-auth.js";
import { LocalGitRepositorySource } from "../adapters/git.js";
import { OctokitGitHubGateway } from "../adapters/github.js";
import { FileSystemCache } from "../adapters/fs-cache.js";
import { CisaKevProvider } from "../adapters/kev.js";
import { FirstEpssProvider } from "../adapters/epss.js";
import { readRepositoryPolicyFile } from "../adapters/local-policy.js";
import { TrivyVulnerabilityDetector } from "../adapters/trivy.js";
import {
  filterDiscoveredRepositories,
  runBotAnalyze,
  runBotPublish,
} from "../application/bot.js";
import type { AnalyzeDependencies } from "../application/analyze.js";
import type { AnalysisReport } from "../domain/model.js";
import {
  validatePolicy,
  type OrganizationPolicy,
  type PolicyLayerState,
} from "../domain/policy.js";

export interface ActionInputs {
  phase: BotPhase;
  organization: string;
  localPath: string;
  reportPath: string;
  repository?: string;
  includeRepositories?: string[];
  appId?: string;
  installationId?: string;
  privateKey?: string;
  token?: string;
}

export async function runAction(inputs: ActionInputs): Promise<void> {
  switch (inputs.phase) {
    case "discover":
      await runDiscoverPhase(inputs);
      return;
    case "analyze":
      await runAnalyzePhase(inputs);
      return;
    case "publish":
      await runPublishPhase(inputs);
      return;
    default: {
      const _exhaustive: never = inputs.phase;
      throw new Error(`Unsupported phase: ${String(_exhaustive)}`);
    }
  }
}

async function runDiscoverPhase(inputs: ActionInputs): Promise<void> {
  const octokit = await resolveOctokit(inputs, "discover");
  const repositories = filterDiscoveredRepositories(
    await listInstallationRepositories(octokit),
    {
      organization: inputs.organization,
      ...(inputs.includeRepositories
        ? { include: inputs.includeRepositories }
        : {}),
    },
  );

  const matrix = {
    include: repositories.map((repository) => ({
      repository: repository.fullName,
      owner: repository.owner,
      name: repository.name,
    })),
  };

  core.setOutput("matrix", JSON.stringify(matrix));
  core.setOutput("repository-count", String(repositories.length));
  core.info(
    `Discovered ${repositories.length} repositories in ${inputs.organization}`,
  );
}

async function runAnalyzePhase(inputs: ActionInputs): Promise<void> {
  const localPath = resolve(inputs.localPath);
  const octokit = await resolveOctokit(inputs, "analyze");
  const gateway = new OctokitGitHubGateway({ octokit });
  const dependencies = createAnalyzeDependencies(gateway);
  const scope = {
    organization: inputs.organization,
    repositories: inputs.repository ? [repositoryName(inputs.repository)] : [],
    localPath,
    includeUncommitted: false,
  };

  const { report, reportPath } = await runBotAnalyze(scope, dependencies, {
    reportPath: inputs.reportPath,
  });

  core.setOutput("report-path", reportPath ?? inputs.reportPath);
  core.setOutput("finding-count", String(report.findings.length));
  core.setOutput("reproducible", String(report.reproducible));
  core.setOutput("policy-verified", String(report.policy.verified));
  core.info(
    `Analyzed ${report.snapshot.owner}/${report.snapshot.repo}: ${report.findings.length} finding(s)`,
  );
}

async function runPublishPhase(inputs: ActionInputs): Promise<void> {
  const report = JSON.parse(
    await readFile(resolve(inputs.reportPath), "utf8"),
  ) as AnalysisReport;
  const octokit = await resolveOctokit(inputs, "publish");
  const gateway = new OctokitGitHubGateway({ octokit });

  const organizationPolicyText = await gateway.readOrganizationPolicy(
    report.snapshot.owner,
  );
  const organizationPolicy = parseOrganizationPolicy(organizationPolicyText);

  const { selected, result } = await runBotPublish(
    report,
    {
      organization: report.snapshot.owner,
      repositories: [report.snapshot.repo],
      localPath: inputs.localPath,
      includeUncommitted: false,
    },
    { gateway },
    {
      organization: organizationPolicy,
      repository: { state: "absent" },
    },
  );

  core.setOutput("selected-count", String(selected.length));
  core.setOutput("published-count", String(result.published.length));
  core.setOutput("result", JSON.stringify(result));
  core.info(
    `Selected ${selected.length} finding(s); published ${result.published.length}`,
  );
}

function createAnalyzeDependencies(
  gateway: OctokitGitHubGateway,
): AnalyzeDependencies {
  const cache = new FileSystemCache("/tmp/techdebtter-action-cache");
  const clock = { now: () => new Date() };

  return {
    repositorySource: new LocalGitRepositorySource(),
    detectors: [new TrivyVulnerabilityDetector()],
    enrichmentProviders: [
      new CisaKevProvider(cache, clock, fetch),
      new FirstEpssProvider(fetch),
    ],
    readOrganizationPolicy: async (organization) => {
      const layer = await gateway.readOrganizationPolicy(organization);
      return parseOrganizationPolicy(layer);
    },
    readRepositoryPolicy: readRepositoryPolicyFile,
    clock,
  };
}

function parseOrganizationPolicy(layer: {
  state: "present" | "absent" | "unverifiable";
  text?: string;
}): PolicyLayerState<OrganizationPolicy> {
  if (layer.state === "absent") {
    return { state: "absent" };
  }
  if (layer.state === "unverifiable" || layer.text === undefined) {
    return { state: "unverifiable" };
  }
  const validated = validatePolicy(layer.text, "organization");
  if (!validated.ok) {
    return { state: "unverifiable" };
  }
  return {
    state: "present",
    value: validated.value as OrganizationPolicy,
  };
}

async function resolveOctokit(
  inputs: ActionInputs,
  phase: BotPhase,
): Promise<Octokit> {
  if (inputs.token) {
    return new Octokit({ auth: inputs.token });
  }

  const credentials = requireAppCredentials(inputs);
  const installation = await createInstallationToken(
    credentials,
    permissionsForPhase(phase),
  );
  return createInstallationOctokit(installation.token);
}

function requireAppCredentials(inputs: ActionInputs): GitHubAppCredentials {
  if (!inputs.appId || !inputs.installationId || !inputs.privateKey) {
    throw new Error(
      "GitHub App credentials (app-id, installation-id, private-key) or token are required",
    );
  }
  return {
    appId: Number(inputs.appId),
    installationId: Number(inputs.installationId),
    privateKey: inputs.privateKey.replace(/\\n/g, "\n"),
  };
}

function repositoryName(fullName: string): string {
  const parts = fullName.split("/");
  return parts[parts.length - 1] ?? fullName;
}

function readInputsFromEnv(): ActionInputs {
  const phase = requiredInput("phase") as BotPhase;
  if (phase !== "discover" && phase !== "analyze" && phase !== "publish") {
    throw new Error(`Unsupported phase: ${phase}`);
  }

  const include = optionalInput("include-repositories");
  const inputs: ActionInputs = {
    phase,
    organization: requiredInput("organization"),
    localPath: optionalInput("path") ?? ".",
    reportPath: optionalInput("report-path") ?? "techdebtter-report.json",
  };

  const repository = optionalInput("repository");
  if (repository) {
    inputs.repository = repository;
  }
  if (include) {
    inputs.includeRepositories = include
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  const appId = optionalInput("app-id");
  if (appId) {
    inputs.appId = appId;
  }
  const installationId = optionalInput("installation-id");
  if (installationId) {
    inputs.installationId = installationId;
  }
  const privateKey = optionalInput("private-key");
  if (privateKey) {
    inputs.privateKey = privateKey;
  }
  const token = optionalInput("token");
  if (token) {
    inputs.token = token;
  }
  return inputs;
}

function requiredInput(name: string): string {
  const value = core.getInput(name, { required: true });
  if (!value) {
    throw new Error(`Missing required input: ${name}`);
  }
  return value;
}

function optionalInput(name: string): string | undefined {
  const value = core.getInput(name);
  return value.length > 0 ? value : undefined;
}

export async function main(): Promise<void> {
  try {
    await runAction(readInputsFromEnv());
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("action/main.js") ||
    process.argv[1].endsWith("action/main.ts"));

if (isDirectRun) {
  void main();
}
