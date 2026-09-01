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
  renderTerminal,
} from "./cli/render.js";

export { PolicyError } from "./domain/policy-error.js";

export { readRepositoryPolicyFile } from "./adapters/local-policy.js";
