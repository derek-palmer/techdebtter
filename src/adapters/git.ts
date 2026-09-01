import type { OperatingScope, RepositorySnapshot } from "../domain/model.js";
import type { RepositorySource } from "../domain/ports.js";
import { PrerequisiteError } from "./errors.js";
import type { ProcessRunner } from "./process.js";
import { execProcessRunner } from "./process.js";

const ORIGIN_PATTERNS = [
  /^git@github\.com:(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/,
  /^https:\/\/(?:[^@]+@)?github\.com\/(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/,
  /^ssh:\/\/git@github\.com\/(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/,
];

export function parseGitHubOrigin(originUrl: string): { owner: string; repo: string } {
  const trimmed = originUrl.trim();
  for (const pattern of ORIGIN_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.groups?.owner && match.groups.repo) {
      return {
        owner: match.groups.owner.toLowerCase(),
        repo: match.groups.repo.replace(/\.git$/, "").toLowerCase(),
      };
    }
  }
  throw new PrerequisiteError(
    "missing-origin",
    `Origin URL is not a supported GitHub remote: ${originUrl}`,
  );
}

export class LocalGitRepositorySource implements RepositorySource {
  private readonly runner: ProcessRunner;

  constructor(runner: ProcessRunner = execProcessRunner) {
    this.runner = runner;
  }

  async snapshot(scope: OperatingScope): Promise<RepositorySnapshot> {
    const root = scope.localPath;

    const inside = await this.runner.run("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
    });
    if (inside.exitCode !== 0 || inside.stdout.trim() !== "true") {
      throw new PrerequisiteError(
        "not-a-git-repository",
        `${root} is not a Git repository`,
      );
    }

    const origin = await this.runner.run("git", ["remote", "get-url", "origin"], {
      cwd: root,
    });
    if (origin.exitCode !== 0 || origin.stdout.trim() === "") {
      throw new PrerequisiteError(
        "missing-origin",
        "Repository is missing an origin remote",
      );
    }

    const { owner, repo } = parseGitHubOrigin(origin.stdout.trim());

    const head = await this.runner.run("git", ["rev-parse", "HEAD"], { cwd: root });
    if (head.exitCode !== 0) {
      throw new PrerequisiteError(
        "not-a-git-repository",
        "Unable to resolve HEAD commit",
      );
    }

    const commitSha = head.stdout.trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(commitSha)) {
      throw new PrerequisiteError(
        "not-a-git-repository",
        `Unexpected commit SHA format: ${commitSha}`,
      );
    }

    const status = await this.runner.run(
      "git",
      ["status", "--porcelain=v1", "-z"],
      { cwd: root },
    );
    const dirty = status.stdout.length > 0;

    return { owner, repo, commitSha, dirty };
  }
}
