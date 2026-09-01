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
