import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  productDefaults,
  resolvePolicy,
  validatePolicy,
} from "../../src/domain/policy.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/policy",
);

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("validatePolicy", () => {
  it("accepts organization and repository fixtures without schemaVersion", () => {
    expect(validatePolicy(fixture("organization.yml"), "organization").ok).toBe(
      true,
    );
    expect(validatePolicy(fixture("repository.yml"), "repository").ok).toBe(
      true,
    );
  });

  it("accepts optional $schema", () => {
    const text = [
      '$schema: "https://techdebtter.dev/schemas/policy.schema.json"',
      "detectors:",
      "  enabled:",
      "    - trivy-vulnerability",
      "",
    ].join("\n");
    const result = validatePolicy(text, "repository");
    expect(result.ok).toBe(true);
  });

  it("rejects unknown keys with JSON pointer and rejected key", () => {
    const result = validatePolicy("notARealField: true\n", "repository");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.includes("notARealField"))).toBe(
      true,
    );
    expect(result.errors.some((error) => error.includes("/"))).toBe(true);
  });
});

describe("resolvePolicy", () => {
  it("uses product defaults when both layers are absent", () => {
    expect(
      resolvePolicy(productDefaults, { state: "absent" }, { state: "absent" }),
    ).toMatchObject({
      detectors: { enabled: ["trivy-vulnerability"] },
      scan: { enabled: true, intervalHours: 24 },
      publication: {
        unattendedMinimumCriticality: "high",
        allowed: true,
      },
      vulnerability: { epssRaiseThreshold: null },
      remediation: {
        enabled: false,
        maxOpenPullRequests: 1,
        minHoursBetweenPullRequests: 24,
        allowStaticOnlyPromotion: false,
        allowed: true,
      },
      scope: { exclusions: [] },
      organizationVerified: true,
      sources: [
        "product-defaults",
        "organization-absent",
        "repository-absent",
      ],
    });
  });

  it("resolves organization and repository fixtures field-by-field", () => {
    const org = validatePolicy(fixture("organization.yml"), "organization");
    const repo = validatePolicy(fixture("repository.yml"), "repository");
    expect(org.ok).toBe(true);
    expect(repo.ok).toBe(true);
    if (!org.ok || !repo.ok) {
      return;
    }

    expect(
      resolvePolicy(
        productDefaults,
        { state: "present", value: org.value },
        { state: "present", value: repo.value },
      ),
    ).toMatchObject({
      detectors: { enabled: ["trivy-vulnerability"] },
      scan: { intervalHours: 48 },
      publication: { unattendedMinimumCriticality: "high", allowed: true },
      remediation: {
        enabled: false,
        maxOpenPullRequests: 1,
        minHoursBetweenPullRequests: 24,
      },
      scope: { exclusions: ["vendor/**", "fixtures/**"] },
    });
  });

  it("clamps repository remediation budget to organization ceilings", () => {
    const resolved = resolvePolicy(
      productDefaults,
      {
        state: "present",
        value: {
          ceilings: {
            remediation: {
              maxOpenPullRequests: 1,
              minHoursBetweenPullRequests: 24,
            },
          },
        },
      },
      {
        state: "present",
        value: {
          remediation: {
            maxOpenPullRequests: 5,
            minHoursBetweenPullRequests: 1,
          },
        },
      },
    );

    expect(resolved.remediation.maxOpenPullRequests).toBe(1);
    expect(resolved.remediation.minHoursBetweenPullRequests).toBe(24);
  });

  it("intersects detector allowlists and retains org-required detectors", () => {
    const resolved = resolvePolicy(
      productDefaults,
      {
        state: "present",
        value: {
          allowedDetectors: ["trivy-vulnerability", "future-detector"],
          requiredDetectors: ["trivy-vulnerability"],
        },
      },
      {
        state: "present",
        value: {
          detectors: { enabled: ["future-detector"] },
        },
      },
    );

    expect(resolved.detectors.enabled).toEqual(["trivy-vulnerability"]);
  });

  it("unions exclusions across layers", () => {
    const resolved = resolvePolicy(
      productDefaults,
      {
        state: "present",
        value: { scope: { exclusions: ["vendor/**"] } },
      },
      {
        state: "present",
        value: { scope: { exclusions: ["fixtures/**"] } },
      },
    );

    expect(resolved.scope.exclusions).toEqual(["vendor/**", "fixtures/**"]);
  });

  it("blocks publication and remediation when organization policy is unverifiable", () => {
    const resolved = resolvePolicy(
      productDefaults,
      { state: "unverifiable" },
      { state: "absent" },
    );

    expect(resolved.publication.allowed).toBe(false);
    expect(resolved.remediation.allowed).toBe(false);
    expect(resolved.organizationVerified).toBe(false);
    expect(resolved.sources).toContain("organization-unverifiable");
  });

  it("replaces label maps from repository policy", () => {
    const resolved = resolvePolicy(
      productDefaults,
      { state: "absent" },
      {
        state: "present",
        value: {
          labels: {
            "techdebtter:vulnerability": "security",
          },
        },
      },
    );

    expect(resolved.labels).toEqual({
      "techdebtter:vulnerability": "security",
    });
  });
});
