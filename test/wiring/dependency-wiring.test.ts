import { describe, expect, it } from "vitest";
import { createAnalyzeDependencies } from "../../src/wiring/dependency-wiring.js";

describe("createAnalyzeDependencies (DependencyWiring)", () => {
  it("wires the full analyze-path dependency set shape", async () => {
    const readOrganizationPolicy = async () =>
      ({ state: "unverifiable" }) as const;
    const dependencies = createAnalyzeDependencies({
      cacheRoot: "/tmp/dependency-wiring-shape-test",
      readOrganizationPolicy,
    });

    expect(dependencies.repositorySource).toBeDefined();
    expect(typeof dependencies.repositorySource.snapshot).toBe("function");

    expect(dependencies.detectors).toHaveLength(1);
    expect(dependencies.detectors[0]?.id).toBe("trivy-vulnerability");

    expect(dependencies.enrichmentProviders).toHaveLength(2);
    expect(dependencies.enrichmentProviders.map((provider) => provider.id)).toEqual(
      ["cisa-kev", "first-epss"],
    );

    expect(typeof dependencies.readRepositoryPolicy).toBe("function");
    expect(typeof dependencies.clock.now).toBe("function");
    expect(dependencies.clock.now()).toBeInstanceOf(Date);
  });

  it("preserves the caller-supplied readOrganizationPolicy implementation as-is (CLI-style stub)", async () => {
    const stub = async () => ({ state: "unverifiable" as const });
    const dependencies = createAnalyzeDependencies({
      cacheRoot: "/tmp/dependency-wiring-cli-stub-test",
      readOrganizationPolicy: stub,
    });

    expect(dependencies.readOrganizationPolicy).toBe(stub);
    await expect(dependencies.readOrganizationPolicy("acme")).resolves.toEqual({
      state: "unverifiable",
    });
  });

  it("preserves the caller-supplied readOrganizationPolicy implementation as-is (Action-style live read)", async () => {
    const calls: string[] = [];
    const liveRead = async (organization: string) => {
      calls.push(organization);
      return { state: "absent" as const };
    };
    const dependencies = createAnalyzeDependencies({
      cacheRoot: "/tmp/dependency-wiring-action-read-test",
      readOrganizationPolicy: liveRead,
    });

    expect(dependencies.readOrganizationPolicy).toBe(liveRead);
    await expect(dependencies.readOrganizationPolicy("acme")).resolves.toEqual({
      state: "absent",
    });
    expect(calls).toEqual(["acme"]);
  });

  it("does not attach a write-scoped GitHub client to any constructed dependency", () => {
    const dependencies = createAnalyzeDependencies({
      cacheRoot: "/tmp/dependency-wiring-no-write-scope-test",
      readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    });

    const candidate = dependencies as typeof dependencies & {
      reconcileFinding?: unknown;
      gateway?: unknown;
    };
    expect(candidate.reconcileFinding).toBeUndefined();
    expect(candidate.gateway).toBeUndefined();
  });

  it("uses the supplied cacheRoot for enrichment-provider caching without altering it", () => {
    const cacheRootA = "/tmp/dependency-wiring-cache-a";
    const cacheRootB = "/tmp/dependency-wiring-cache-b";

    const dependenciesA = createAnalyzeDependencies({
      cacheRoot: cacheRootA,
      readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    });
    const dependenciesB = createAnalyzeDependencies({
      cacheRoot: cacheRootB,
      readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    });

    // Each call constructs independent adapter instances (no shared cache
    // singleton across differing cache roots).
    expect(dependenciesA.enrichmentProviders[0]).not.toBe(
      dependenciesB.enrichmentProviders[0],
    );
  });
});
