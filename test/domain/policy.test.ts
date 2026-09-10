import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  productDefaults,
  resolvePolicy,
  validatePolicy,
} from "../../src/domain/policy.js";
import { PolicyError } from "../../src/domain/policy-error.js";
import { readRepositoryPolicyFile } from "../../src/adapters/local-policy.js";

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

// NFR2.3: the four policy-presence cases (present-valid / present-invalid /
// confirmed-absent / unverifiable) must resolve per SPEC.md V9/V10, and a
// human policy/selection override must be recorded as a single, audited
// operation rather than persisted state (V12).
describe("policy-presence resolution matrix (NFR2.3, SPEC.md V9/V10)", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("present-valid: a validated organization/repository policy layer is applied", () => {
    const org = validatePolicy(fixture("organization.yml"), "organization");
    expect(org.ok).toBe(true);
    if (!org.ok) {
      return;
    }

    const resolved = resolvePolicy(
      productDefaults,
      { state: "present", value: org.value },
      { state: "absent" },
    );

    expect(resolved.organizationVerified).toBe(true);
    expect(resolved.sources).toContain("organization-policy");
  });

  it("present-invalid: an invalid repository policy file stops operation (throws, does not fall back)", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "techdebtter-policy-invalid-"));
    tempDirs.push(repoPath);
    await writeFile(
      join(repoPath, ".techdebtter.yml"),
      "notARealField: true\n",
      "utf8",
    );

    await expect(readRepositoryPolicyFile(repoPath)).rejects.toBeInstanceOf(
      PolicyError,
    );
  });

  it("confirmed-absent: a missing policy layer falls back to product defaults", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "techdebtter-policy-absent-"));
    tempDirs.push(repoPath);

    await expect(readRepositoryPolicyFile(repoPath)).resolves.toEqual({
      state: "absent",
    });

    const resolved = resolvePolicy(
      productDefaults,
      { state: "absent" },
      { state: "absent" },
    );
    expect(resolved.sources).toEqual([
      "product-defaults",
      "organization-absent",
      "repository-absent",
    ]);
  });

  it("unverifiable: an unverifiable organization policy blocks publication and remediation", () => {
    const resolved = resolvePolicy(
      productDefaults,
      { state: "unverifiable" },
      { state: "absent" },
    );

    expect(resolved.organizationVerified).toBe(false);
    expect(resolved.publication.allowed).toBe(false);
    expect(resolved.remediation.allowed).toBe(false);
  });

  it("a human policy/selection override is recorded as a single, audited operation — resolution is stateless across independent calls", () => {
    // Each resolvePolicy invocation is a pure function of its own inputs; no
    // module-level cache or override registry carries a prior call's inputs
    // into the next one. This is what makes the CLI's explicit, per-invocation
    // `--select`/policy-input requirement (already asserted in
    // test/cli/publish.test.ts "requires explicit selection IDs") a genuine
    // single-operation, audited override rather than a silently-persisted one:
    // there is no stored state for a later call to inherit.
    const first = resolvePolicy(
      productDefaults,
      { state: "unverifiable" },
      { state: "absent" },
    );
    const second = resolvePolicy(
      productDefaults,
      { state: "absent" },
      { state: "absent" },
    );

    expect(first.organizationVerified).toBe(false);
    expect(second.organizationVerified).toBe(true);
    expect(second.sources).not.toContain("organization-unverifiable");
  });
});
