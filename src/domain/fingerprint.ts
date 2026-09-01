import { createHash } from "node:crypto";

export interface DetectionFingerprintInput {
  detector: string;
  owner: string;
  repo: string;
  packageEcosystem: string;
  packageName: string;
  installedVersion: string;
  vulnerabilityIds: string[];
  target: string;
}

export interface FindingFingerprintInput {
  owner: string;
  repo: string;
  packageEcosystem: string;
  packageName: string;
  vulnerabilityIds: string[];
  fixedVersions: string[];
}

export function detectionFingerprint(input: DetectionFingerprintInput): string {
  return hashCanonical({
    kind: "detection",
    detector: canonicalize(input.detector),
    owner: canonicalize(input.owner),
    repo: canonicalize(input.repo),
    packageEcosystem: canonicalize(input.packageEcosystem),
    packageName: canonicalize(input.packageName),
    installedVersion: canonicalize(input.installedVersion),
    vulnerabilityIds: canonicalizeSet(input.vulnerabilityIds),
    target: canonicalize(input.target),
  });
}

export function findingFingerprint(input: FindingFingerprintInput): string {
  return hashCanonical({
    kind: "finding",
    owner: canonicalize(input.owner),
    repo: canonicalize(input.repo),
    packageEcosystem: canonicalize(input.packageEcosystem),
    packageName: canonicalize(input.packageName),
    vulnerabilityIds: canonicalizeSet(input.vulnerabilityIds),
    fixedVersions: canonicalizeSet(input.fixedVersions),
  });
}

function canonicalize(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalizeSet(values: string[]): string[] {
  return [...new Set(values.map(canonicalize))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function hashCanonical(value: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}
