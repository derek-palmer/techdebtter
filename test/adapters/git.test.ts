import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PrerequisiteError } from "../../src/adapters/errors.js";
import {
  LocalGitRepositorySource,
  parseGitHubOrigin,
} from "../../src/adapters/git.js";
import type { ProcessRunner } from "../../src/adapters/process.js";
import { execProcessRunner } from "../../src/adapters/process.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("parseGitHubOrigin", () => {
  it("normalizes ssh and https origin formats", () => {
    expect(parseGitHubOrigin("git@github.com:Acme/Api.git")).toEqual({
      owner: "acme",
      repo: "api",
    });
    expect(parseGitHubOrigin("https://github.com/Acme/Api.git")).toEqual({
      owner: "acme",
      repo: "api",
    });
  });
});

describe("LocalGitRepositorySource", () => {
  it("returns a lowercase 40-char commit SHA and dirty state from porcelain output", async () => {
    const repoPath = await createTempRepo("git@github.com:Acme/Api.git");
    await writeFile(join(repoPath, "dirty.txt"), "pending\n", "utf8");

    const source = new LocalGitRepositorySource(execProcessRunner);
    const snapshot = await source.snapshot({
      organization: "acme",
      repositories: ["api"],
      localPath: repoPath,
      includeUncommitted: false,
    });

    expect(snapshot).toMatchObject({
      owner: "acme",
      repo: "api",
      dirty: true,
    });
    expect(snapshot.commitSha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("throws a typed error when origin is missing", async () => {
    const repoPath = await createTempRepo(undefined);
    const source = new LocalGitRepositorySource(execProcessRunner);

    await expect(
      source.snapshot({
        organization: "acme",
        repositories: ["api"],
        localPath: repoPath,
        includeUncommitted: false,
      }),
    ).rejects.toMatchObject({
      code: "missing-origin",
    } satisfies Partial<PrerequisiteError>);
  });

  it("throws a typed error for non-git paths", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "techdebtter-nogit-"));
    tempDirs.push(repoPath);
    const source = new LocalGitRepositorySource(execProcessRunner);

    await expect(
      source.snapshot({
        organization: "acme",
        repositories: ["api"],
        localPath: repoPath,
        includeUncommitted: false,
      }),
    ).rejects.toMatchObject({
      code: "not-a-git-repository",
    } satisfies Partial<PrerequisiteError>);
  });
});

async function createTempRepo(origin?: string): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), "techdebtter-git-"));
  tempDirs.push(repoPath);

  await runGit(repoPath, ["init"]);
  await runGit(repoPath, ["config", "user.email", "techdebtter@example.com"]);
  await runGit(repoPath, ["config", "user.name", "TechDebtter"]);
  await writeFile(join(repoPath, "README.md"), "# test\n", "utf8");
  await runGit(repoPath, ["add", "README.md"]);
  await runGit(repoPath, ["commit", "-m", "init"]);

  if (origin) {
    await runGit(repoPath, ["remote", "add", "origin", origin]);
  }

  return repoPath;
}

async function runGit(cwd: string, args: string[]): Promise<void> {
  const runner: ProcessRunner = execProcessRunner;
  const result = await runner.run("git", args, { cwd });
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}
