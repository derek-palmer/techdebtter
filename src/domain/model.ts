export type Criticality = "critical" | "high" | "medium" | "low";

export type FindingClass = "vulnerability" | "debt" | "defect";

export type RemediationRoute =
  | "needs-triage"
  | "needs-info"
  | "ready-for-agent"
  | "ready-for-human";

/** Provenance markers recorded on an Analysis Report and Effective Policy. */
export type PolicySource =
  | "product-defaults"
  | "organization-policy"
  | "organization-absent"
  | "organization-unverifiable"
  | "repository-policy"
  | "repository-absent";

export interface RepositorySnapshot {
  owner: string;
  repo: string;
  commitSha: string;
  dirty: boolean;
}

export interface OperatingScope {
  organization: string;
  repositories: string[];
  localPath: string;
  includeUncommitted: boolean;
}

export interface Evidence {
  kind: "repository" | "detector" | "severity" | "kev" | "epss" | "validation";
  source: string;
  observedAt: string;
  subject: string;
  value: string | number | boolean;
  url?: string;
}

export interface Detection {
  fingerprint: string;
  detector: string;
  detectorVersion: string;
  class: FindingClass;
  packageEcosystem: string;
  packageName: string;
  installedVersion: string;
  fixedVersions: string[];
  vulnerabilityIds: string[];
  target: string;
  severity: "unknown" | "negligible" | "low" | "medium" | "high" | "critical";
  evidence: Evidence[];
}

export interface Finding {
  selectionId: string;
  fingerprint: string;
  detectionFingerprints: string[];
  class: FindingClass;
  title: string;
  calculatedCriticality: Criticality;
  effectiveCriticality: Criticality;
  criticalityReasons: string[];
  route: RemediationRoute;
  evidence: Evidence[];
}

export interface AnalysisReport {
  schemaVersion: "1.0.0";
  generatedAt: string;
  reproducible: boolean;
  snapshot: RepositorySnapshot;
  policy: { verified: boolean; sources: PolicySource[] };
  findings: Finding[];
  warnings: string[];
  reportHash?: string;
}

export interface PublicationResult {
  published: Array<{
    selectionId: string;
    issueNumber: number;
    issueUrl: string;
    action: "created" | "updated" | "reopened" | "suppressed";
  }>;
  warnings: string[];
}
