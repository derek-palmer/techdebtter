import type {
  Detection,
  Evidence,
  Finding,
  OperatingScope,
  PublicationResult,
  RepositorySnapshot,
} from "./model.js";

export interface RepositorySource {
  snapshot(scope: OperatingScope): Promise<RepositorySnapshot>;
}

export interface Detector {
  readonly id: string;
  detect(snapshot: RepositorySnapshot, root: string): Promise<Detection[]>;
}

export interface EnrichmentProvider {
  readonly id: string;
  enrich(detections: Detection[]): Promise<{
    evidenceByVulnerability: Map<string, Evidence[]>;
    warnings: string[];
  }>;
}

export interface GitHubGateway {
  readOrganizationPolicy(
    owner: string,
  ): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }>;
  readRepositoryPolicy(
    snapshot: RepositorySnapshot,
  ): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }>;
  reconcileFinding(
    snapshot: RepositorySnapshot,
    finding: Finding,
    reportHash: string,
  ): Promise<PublicationResult["published"][number]>;
}

export interface Cache {
  get(key: string): Promise<{ storedAt: string; value: string } | undefined>;
  set(key: string, value: string, storedAt: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}
