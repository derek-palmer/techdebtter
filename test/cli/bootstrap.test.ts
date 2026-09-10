import { describe, expect, it } from "vitest";
import { createDefaultAnalyzeDependencies } from "../../src/cli/bootstrap.js";

describe("createDefaultAnalyzeDependencies (CLI bootstrap, post-DependencyWiring regression)", () => {
  it("produces an AnalyzeDependencies set equivalent to the pre-refactor construction", async () => {
    const dependencies = createDefaultAnalyzeDependencies();

    expect(dependencies.detectors).toHaveLength(1);
    expect(dependencies.detectors[0]?.id).toBe("trivy-vulnerability");
    expect(dependencies.enrichmentProviders.map((provider) => provider.id)).toEqual(
      ["cisa-kev", "first-epss"],
    );
    expect(typeof dependencies.repositorySource.snapshot).toBe("function");
    expect(typeof dependencies.readRepositoryPolicy).toBe("function");
    expect(dependencies.clock.now()).toBeInstanceOf(Date);
  });

  it("preserves the CLI's hardcoded 'unverifiable' readOrganizationPolicy stub", async () => {
    const dependencies = createDefaultAnalyzeDependencies();

    await expect(
      dependencies.readOrganizationPolicy("any-organization"),
    ).resolves.toEqual({ state: "unverifiable" });
  });

  it("does not attach a write-scoped GitHub client to the analyze dependency set", () => {
    const dependencies = createDefaultAnalyzeDependencies();
    const candidate = dependencies as typeof dependencies & {
      reconcileFinding?: unknown;
      gateway?: unknown;
    };

    expect(candidate.reconcileFinding).toBeUndefined();
    expect(candidate.gateway).toBeUndefined();
  });
});
