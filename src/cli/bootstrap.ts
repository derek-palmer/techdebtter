import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Octokit } from "@octokit/rest";
import { activeGhToken } from "../adapters/gh-auth.js";
import { LocalGitRepositorySource } from "../adapters/git.js";
import { OctokitGitHubGateway } from "../adapters/github.js";
import { OctokitRemediationGateway } from "../adapters/remediation-github.js";
import { readRepositoryPolicyFile } from "../adapters/local-policy.js";
import { FileSystemCache } from "../adapters/fs-cache.js";
import { CisaKevProvider } from "../adapters/kev.js";
import { FirstEpssProvider } from "../adapters/epss.js";
import { execProcessRunner } from "../adapters/process.js";
import { TrivyVulnerabilityDetector } from "../adapters/trivy.js";
import type { AnalyzeDependencies } from "../application/analyze.js";
import type { PublishDependencies } from "../application/publish.js";
import type { RemediateDependencies } from "../application/remediate.js";

let defaultCacheRoot: string | undefined;

export function createDefaultAnalyzeDependencies(): AnalyzeDependencies {
  const cacheRoot = defaultCacheRoot ?? join(tmpdir(), "techdebtter-cache");
  defaultCacheRoot = cacheRoot;
  const cache = new FileSystemCache(cacheRoot);
  const clock = { now: () => new Date() };

  return {
    repositorySource: new LocalGitRepositorySource(),
    detectors: [new TrivyVulnerabilityDetector()],
    enrichmentProviders: [
      new CisaKevProvider(cache, clock, fetch),
      new FirstEpssProvider(fetch),
    ],
    readOrganizationPolicy: async () => ({ state: "unverifiable" }),
    readRepositoryPolicy: readRepositoryPolicyFile,
    clock,
  };
}

export async function createDefaultPublishDependencies(): Promise<PublishDependencies> {
  const token = await activeGhToken(execProcessRunner);
  const octokit = new Octokit({ auth: token });
  return {
    gateway: new OctokitGitHubGateway({ octokit }),
  };
}

export async function createDefaultRemediateDependencies(): Promise<
  Pick<RemediateDependencies, "gateway"> & {
    policyLayers: {
      organization: { state: "absent" };
      repository: {
        state: "present";
        value: { remediation: { enabled: true } };
      };
    };
    baseBranch: string;
  }
> {
  const token = await activeGhToken(execProcessRunner);
  const octokit = new Octokit({ auth: token });
  return {
    gateway: new OctokitRemediationGateway({ octokit }),
    // User Identity CLI: explicit remediate command opts into remediation.
    policyLayers: {
      organization: { state: "absent" },
      repository: {
        state: "present",
        value: { remediation: { enabled: true } },
      },
    },
    baseBranch: "main",
  };
}

export async function createCliTestCacheRoot(): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const path = await mkdtemp(join(tmpdir(), "techdebtter-cli-cache-"));
  defaultCacheRoot = path;
  await mkdir(path, { recursive: true });
  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
      defaultCacheRoot = undefined;
    },
  };
}

export async function writeReportFixture(
  directory: string,
  fileName: string,
  contents: string,
): Promise<string> {
  const filePath = join(directory, fileName);
  await writeFile(filePath, contents, "utf8");
  return filePath;
}
