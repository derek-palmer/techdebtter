import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";
import type { Criticality, PolicySource } from "./model.js";

const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../schemas/policy.schema.json",
);

const policySchema = JSON.parse(readFileSync(schemaPath, "utf8")) as object;

export interface ProductDefaults {
  detectors: {
    allowed: string[];
    required: string[];
  };
  scan: {
    enabled: boolean;
    intervalHours: number;
  };
  publication: {
    unattendedMinimumCriticality: Criticality;
  };
  vulnerability: {
    epssRaiseThreshold: number | null;
  };
  remediation: {
    enabled: boolean;
    maxOpenPullRequests: number;
    minHoursBetweenPullRequests: number;
    allowStaticOnlyPromotion: boolean;
  };
  ai: {
    enabled: boolean;
    allowedPurposes: string[];
  };
  scope: {
    exclusions: string[];
  };
}

export interface OrganizationPolicy {
  $schema?: string;
  defaults?: {
    scan?: Partial<ProductDefaults["scan"]>;
    publication?: Partial<ProductDefaults["publication"]>;
    vulnerability?: Partial<ProductDefaults["vulnerability"]>;
    remediation?: Partial<ProductDefaults["remediation"]>;
    ai?: Partial<ProductDefaults["ai"]>;
    scope?: Partial<ProductDefaults["scope"]>;
  };
  ceilings?: {
    scan?: { intervalHours?: number };
    remediation?: {
      maxOpenPullRequests?: number;
      minHoursBetweenPullRequests?: number;
    };
  };
  allowedDetectors?: string[];
  requiredDetectors?: string[];
  scope?: {
    exclusions?: string[];
  };
}

export interface RepositoryPolicy {
  $schema?: string;
  scan?: Partial<ProductDefaults["scan"]>;
  publication?: Partial<ProductDefaults["publication"]>;
  vulnerability?: Partial<ProductDefaults["vulnerability"]>;
  remediation?: Partial<ProductDefaults["remediation"]>;
  ai?: Partial<ProductDefaults["ai"]>;
  detectors?: {
    enabled?: string[];
  };
  scope?: {
    exclusions?: string[];
  };
  labels?: Record<string, string>;
}

export type PolicyLayerState<T> =
  | { state: "absent" }
  | { state: "unverifiable" }
  | { state: "present"; value: T };

export interface EffectivePolicy {
  detectors: { enabled: string[] };
  scan: ProductDefaults["scan"];
  publication: ProductDefaults["publication"] & { allowed: boolean };
  vulnerability: ProductDefaults["vulnerability"];
  remediation: ProductDefaults["remediation"] & { allowed: boolean };
  ai: ProductDefaults["ai"];
  scope: { exclusions: string[] };
  labels: Record<string, string>;
  organizationVerified: boolean;
  sources: PolicySource[];
}

export type PolicyValidationResult =
  | { ok: true; value: OrganizationPolicy | RepositoryPolicy }
  | { ok: false; errors: string[] };

export const productDefaults: ProductDefaults = {
  detectors: {
    allowed: ["trivy-vulnerability"],
    required: ["trivy-vulnerability"],
  },
  scan: { enabled: true, intervalHours: 24 },
  publication: { unattendedMinimumCriticality: "high" },
  vulnerability: { epssRaiseThreshold: null },
  remediation: {
    enabled: false,
    maxOpenPullRequests: 1,
    minHoursBetweenPullRequests: 24,
    allowStaticOnlyPromotion: false,
  },
  ai: {
    enabled: false,
    allowedPurposes: [],
  },
  scope: { exclusions: [] },
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateSchema: false,
});

ajv.addSchema(policySchema);

const organizationValidator = ajv.getSchema(
  "https://techdebtter.dev/schemas/policy.schema.json#/$defs/organizationPolicy",
);
const repositoryValidator = ajv.getSchema(
  "https://techdebtter.dev/schemas/policy.schema.json#/$defs/repositoryPolicy",
);

if (!organizationValidator || !repositoryValidator) {
  throw new Error("Failed to compile TechDebtter policy schema definitions");
}

const validateOrganization = organizationValidator;
const validateRepository = repositoryValidator;

export function validatePolicy(
  text: string,
  kind: "organization" | "repository",
): PolicyValidationResult {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`YAML parse error: ${message}`] };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      errors: ["Policy root must be a YAML mapping/object"],
    };
  }

  const validator =
    kind === "organization" ? validateOrganization : validateRepository;
  const valid = validator(parsed);
  if (valid) {
    return {
      ok: true,
      value:
        kind === "organization"
          ? (parsed as OrganizationPolicy)
          : (parsed as RepositoryPolicy),
    };
  }

  return {
    ok: false,
    errors: (validator.errors ?? []).map(formatAjvError),
  };
}

export function resolvePolicy(
  product: ProductDefaults,
  organization: PolicyLayerState<OrganizationPolicy>,
  repository: PolicyLayerState<RepositoryPolicy>,
): EffectivePolicy {
  const sources: PolicySource[] = ["product-defaults"];
  let organizationVerified = true;

  let scan = { ...product.scan };
  let publication = { ...product.publication };
  let vulnerability = { ...product.vulnerability };
  let remediation = { ...product.remediation };
  let ai = { ...product.ai, allowedPurposes: [...product.ai.allowedPurposes] };
  let allowedDetectors = [...product.detectors.allowed];
  let requiredDetectors = [...product.detectors.required];
  let exclusions = [...product.scope.exclusions];
  let labels: Record<string, string> = {};
  let ceilings: NonNullable<OrganizationPolicy["ceilings"]> = {
    scan: { intervalHours: Number.POSITIVE_INFINITY },
    remediation: {
      maxOpenPullRequests: product.remediation.maxOpenPullRequests,
      minHoursBetweenPullRequests:
        product.remediation.minHoursBetweenPullRequests,
    },
  };

  if (organization.state === "unverifiable") {
    organizationVerified = false;
    sources.push("organization-unverifiable");
  } else if (organization.state === "absent") {
    sources.push("organization-absent");
  } else {
    sources.push("organization-policy");
    const org = organization.value;

    if (org.defaults?.scan) {
      scan = { ...scan, ...org.defaults.scan };
    }
    if (org.defaults?.publication) {
      publication = { ...publication, ...org.defaults.publication };
    }
    if (org.defaults?.vulnerability) {
      vulnerability = { ...vulnerability, ...org.defaults.vulnerability };
    }
    if (org.defaults?.remediation) {
      remediation = { ...remediation, ...org.defaults.remediation };
    }
    if (org.defaults?.ai) {
      ai = {
        ...ai,
        ...org.defaults.ai,
        allowedPurposes: org.defaults.ai.allowedPurposes
          ? [...org.defaults.ai.allowedPurposes]
          : ai.allowedPurposes,
      };
    }
    if (org.defaults?.scope?.exclusions) {
      exclusions = unionStable(exclusions, org.defaults.scope.exclusions);
    }
    if (org.scope?.exclusions) {
      exclusions = unionStable(exclusions, org.scope.exclusions);
    }
    if (org.allowedDetectors) {
      allowedDetectors = intersectStable(allowedDetectors, org.allowedDetectors);
    }
    if (org.requiredDetectors) {
      requiredDetectors = unionStable(requiredDetectors, org.requiredDetectors);
    }
    if (org.ceilings) {
      ceilings = {
        scan: {
          intervalHours:
            org.ceilings.scan?.intervalHours ??
            ceilings.scan?.intervalHours ??
            Number.POSITIVE_INFINITY,
        },
        remediation: {
          maxOpenPullRequests:
            org.ceilings.remediation?.maxOpenPullRequests ??
            ceilings.remediation?.maxOpenPullRequests ??
            product.remediation.maxOpenPullRequests,
          minHoursBetweenPullRequests:
            org.ceilings.remediation?.minHoursBetweenPullRequests ??
            ceilings.remediation?.minHoursBetweenPullRequests ??
            product.remediation.minHoursBetweenPullRequests,
        },
      };
    }
  }

  if (repository.state === "absent") {
    sources.push("repository-absent");
  } else if (repository.state === "unverifiable") {
    // Repository policy itself is local; treat unverifiable like absent for resolution.
    sources.push("repository-absent");
  } else {
    sources.push("repository-policy");
    const repo = repository.value;

    if (repo.scan) {
      scan = { ...scan, ...repo.scan };
    }
    if (repo.publication) {
      publication = { ...publication, ...repo.publication };
    }
    if (repo.vulnerability) {
      vulnerability = { ...vulnerability, ...repo.vulnerability };
    }
    if (repo.remediation) {
      remediation = { ...remediation, ...repo.remediation };
    }
    if (repo.ai) {
      ai = {
        ...ai,
        ...repo.ai,
        allowedPurposes: repo.ai.allowedPurposes
          ? [...repo.ai.allowedPurposes]
          : ai.allowedPurposes,
      };
    }
    if (repo.scope?.exclusions) {
      exclusions = unionStable(exclusions, repo.scope.exclusions);
    }
    if (repo.labels) {
      labels = { ...repo.labels };
    }
  }

  scan = {
    ...scan,
    intervalHours: Math.min(
      scan.intervalHours,
      ceilings.scan?.intervalHours ?? Number.POSITIVE_INFINITY,
    ),
  };

  remediation = {
    ...remediation,
    maxOpenPullRequests: Math.min(
      remediation.maxOpenPullRequests,
      ceilings.remediation?.maxOpenPullRequests ??
        remediation.maxOpenPullRequests,
    ),
    // Cadence floors cannot be shortened below the organization ceiling.
    minHoursBetweenPullRequests: Math.max(
      remediation.minHoursBetweenPullRequests,
      ceilings.remediation?.minHoursBetweenPullRequests ??
        remediation.minHoursBetweenPullRequests,
    ),
  };

  let enabledDetectors = allowedDetectors;
  if (repository.state === "present" && repository.value.detectors?.enabled) {
    enabledDetectors = intersectStable(
      allowedDetectors,
      repository.value.detectors.enabled,
    );
  }
  enabledDetectors = unionStable(enabledDetectors, requiredDetectors);

  const writeAllowed = organizationVerified;

  return {
    detectors: { enabled: enabledDetectors },
    scan,
    publication: { ...publication, allowed: writeAllowed },
    vulnerability,
    remediation: { ...remediation, allowed: writeAllowed },
    ai,
    scope: { exclusions },
    labels,
    organizationVerified,
    sources,
  };
}

function formatAjvError(error: ErrorObject): string {
  const pointer = error.instancePath === "" ? "/" : error.instancePath;
  const rejectedKey =
    error.keyword === "additionalProperties" &&
    typeof error.params.additionalProperty === "string"
      ? error.params.additionalProperty
      : undefined;
  if (rejectedKey) {
    return `${pointer}: unknown key "${rejectedKey}"`;
  }
  return `${pointer}: ${error.message ?? "invalid"}`;
}

function intersectStable(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return uniqueStable(left.filter((item) => rightSet.has(item)));
}

function unionStable(left: string[], right: string[]): string[] {
  return uniqueStable([...left, ...right]);
}

function uniqueStable(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
