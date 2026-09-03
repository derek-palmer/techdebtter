export type {
  AnalysisReport,
  Criticality,
  Detection,
  Evidence,
  Finding,
  FindingClass,
  OperatingScope,
  PolicySource,
  PublicationResult,
  RemediationRoute,
  RepositorySnapshot,
} from "./domain/model.js";

export type {
  Cache,
  Clock,
  Detector,
  EnrichmentProvider,
  GitHubGateway,
  RepositorySource,
} from "./domain/ports.js";

export {
  productDefaults,
  resolvePolicy,
  validatePolicy,
} from "./domain/policy.js";

export type {
  EffectivePolicy,
  OrganizationPolicy,
  PolicyLayerState,
  PolicyValidationResult,
  ProductDefaults,
  RepositoryPolicy,
} from "./domain/policy.js";

export {
  detectionFingerprint,
  findingFingerprint,
} from "./domain/fingerprint.js";

export type {
  DetectionFingerprintInput,
  FindingFingerprintInput,
} from "./domain/fingerprint.js";

export { calculateVulnerabilityCriticality } from "./domain/criticality.js";

export type { CriticalityResult } from "./domain/criticality.js";

export { triage } from "./domain/triage.js";

export type { TriageContext } from "./domain/triage.js";

export {
  LocalGitRepositorySource,
  parseGitHubOrigin,
} from "./adapters/git.js";

export {
  TrivyVulnerabilityDetector,
  isSupportedVersion,
} from "./adapters/trivy.js";

export type { ProcessRunner } from "./adapters/process.js";

export { execProcessRunner } from "./adapters/process.js";

export { PrerequisiteError } from "./adapters/errors.js";

export type { PrerequisiteCode } from "./adapters/errors.js";

export { FileSystemCache } from "./adapters/fs-cache.js";

export { CisaKevProvider, CISA_KEV_URL } from "./adapters/kev.js";

export { FirstEpssProvider, FIRST_EPSS_BASE_URL } from "./adapters/epss.js";

export type { FetchFn } from "./adapters/fetch.js";

export { analyze, assertAnalyzeIsReadOnly } from "./application/analyze.js";

export type { AnalyzeDependencies } from "./application/analyze.js";

export { publish } from "./application/publish.js";

export type { PublishDependencies } from "./application/publish.js";

export { PublishError } from "./application/publish-error.js";

export type { PublishErrorCode } from "./application/publish-error.js";

export { activeGhToken, GhAuthError, redactToken } from "./adapters/gh-auth.js";

export {
  OctokitGitHubGateway,
  buildMetadata,
  buildSemanticLabels,
  computeEvidenceDigest,
  findIssueByFingerprint,
  mergeIssueLabels,
  parseMetadata,
  renderIssueBody,
  renderMetadataComment,
} from "./adapters/github.js";

export type {
  GitHubIssueRecord,
  OctokitGitHubGatewayOptions,
  TechDebtterIssueMetadata,
} from "./adapters/github.js";

export { computeReportHash, withReportHash } from "./application/report-hash.js";

export { createAnalysisReportValidator, analysisReportSchema } from "./application/report-schema.js";

export { runCli } from "./cli/main.js";

export type { CliIo, RunCliOptions } from "./cli/main.js";

export {
  exceedsFailOnThreshold,
  renderMarkdown,
  renderPublicationTerminal,
  renderTerminal,
} from "./cli/render.js";

export { selectUnattendedFindings, selectionIds } from "./application/unattended-select.js";

export {
  filterDiscoveredRepositories,
  runBotAnalyze,
  runBotPublish,
} from "./application/bot.js";

export {
  createInstallationOctokit,
  createInstallationToken,
  listInstallationRepositories,
  permissionsForPhase,
} from "./adapters/github-app-auth.js";

export type {
  BotPhase,
  GitHubAppCredentials,
  InstallationRepository,
  InstallationToken,
} from "./adapters/github-app-auth.js";

export { runAction } from "./action/main.js";

export type { ActionInputs } from "./action/main.js";

export {
  evaluateRemediationBudget,
  selectRequiredCheckOutcome,
} from "./domain/remediation.js";

export type {
  CheckRunSummary,
  FileMutation,
  PullRequestRecord,
  RemediationBudgetState,
  RemediationGateway,
  RemediationPlan,
  Remediator,
} from "./domain/remediation.js";

export { NpmPackageLockRemediator } from "./adapters/npm-remediator.js";

export { PythonRequirementsRemediator } from "./adapters/python-remediator.js";

export { DockerBaseImageRemediator } from "./adapters/docker-remediator.js";

export { RubyGemfileRemediator } from "./adapters/ruby-remediator.js";

export { TerraformProviderRemediator } from "./adapters/terraform-remediator.js";

export { createDefaultRemediators } from "./adapters/remediators.js";

export {
  AiPolicyError,
  assertAiAllowed,
  buildAiTaskPayload,
} from "./adapters/ai.js";

export type {
  AiPlanner,
  AiPolicyGate,
  AiTaskPayload,
  AiTaskRequest,
} from "./adapters/ai.js";

export {
  observeRemediationPullRequest,
  remediate,
} from "./application/remediate.js";

export type {
  RemediateDependencies,
  RemediationResult,
} from "./application/remediate.js";

export { RemediationError } from "./application/remediation-error.js";

export type { RemediationErrorCode } from "./application/remediation-error.js";

export { PolicyError } from "./domain/policy-error.js";

export { readRepositoryPolicyFile } from "./adapters/local-policy.js";
