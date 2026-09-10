import { describe, expect, it } from "vitest";
import { Octokit } from "@octokit/rest";
import { createAnalyzeDependencies } from "../../src/action/main.js";
import { OctokitGitHubGateway } from "../../src/adapters/github.js";

describe("createAnalyzeDependencies (Action main, post-DependencyWiring regression)", () => {
  it("produces an AnalyzeDependencies set equivalent to the pre-refactor construction", async () => {
    const gateway = new OctokitGitHubGateway({ octokit: new Octokit() });
    const dependencies = createAnalyzeDependencies(gateway);

    expect(dependencies.detectors).toHaveLength(1);
    expect(dependencies.detectors[0]?.id).toBe("trivy-vulnerability");
    expect(dependencies.enrichmentProviders.map((provider) => provider.id)).toEqual(
      ["cisa-kev", "first-epss"],
    );
    expect(typeof dependencies.repositorySource.snapshot).toBe("function");
    expect(typeof dependencies.readRepositoryPolicy).toBe("function");
    expect(dependencies.clock.now()).toBeInstanceOf(Date);
  });

  it("preserves the Action's live gateway.readOrganizationPolicy read (via parseOrganizationPolicy)", async () => {
    let requestedOrganization: string | undefined;
    const gateway = {
      readOrganizationPolicy: async (organization: string) => {
        requestedOrganization = organization;
        return { state: "absent" as const };
      },
    } as unknown as OctokitGitHubGateway;

    const dependencies = createAnalyzeDependencies(gateway);
    const result = await dependencies.readOrganizationPolicy("acme");

    expect(requestedOrganization).toBe("acme");
    expect(result).toEqual({ state: "absent" });
  });

  it("does not attach a write-scoped GitHub client to the analyze dependency set", () => {
    const gateway = new OctokitGitHubGateway({ octokit: new Octokit() });
    const dependencies = createAnalyzeDependencies(gateway);
    const candidate = dependencies as typeof dependencies & {
      reconcileFinding?: unknown;
    };

    expect(candidate.reconcileFinding).toBeUndefined();
  });
});
