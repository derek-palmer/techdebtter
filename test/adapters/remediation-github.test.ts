import { describe, expect, it, vi } from "vitest";
import { OctokitRemediationGateway } from "../../src/adapters/remediation-github.js";
import type { RepositorySnapshot } from "../../src/domain/model.js";

const snapshot: RepositorySnapshot = {
  owner: "acme",
  repo: "api",
  commitSha: "a".repeat(40),
  dirty: false,
};

describe("OctokitRemediationGateway", () => {
  it("creates a draft PR from static file mutations", async () => {
    const octokit = {
      rest: {
        git: {
          getRef: vi.fn(async () => ({ data: { object: { sha: "base-sha" } } })),
          getCommit: vi.fn(async () => ({
            data: { tree: { sha: "base-tree" } },
          })),
          createBlob: vi.fn(async () => ({ data: { sha: "blob-sha" } })),
          createTree: vi.fn(async () => ({ data: { sha: "tree-sha" } })),
          createCommit: vi.fn(async () => ({ data: { sha: "commit-sha" } })),
          createRef: vi.fn(async () => ({ data: {} })),
        },
        pulls: {
          create: vi.fn(async () => ({
            data: {
              number: 42,
              html_url: "https://github.com/acme/api/pull/42",
              draft: true,
              title: "Upgrade lodash",
              created_at: "2026-09-07T00:00:00.000Z",
              labels: [{ name: "techdebtter" }],
              head: { sha: "commit-sha", ref: "techdebtter/remediate-abc" },
            },
          })),
          list: vi.fn(),
          update: vi.fn(),
        },
        issues: {
          addLabels: vi.fn(async () => ({ data: [] })),
        },
        checks: {
          listForRef: vi.fn(),
        },
        repos: {
          getBranchProtection: vi.fn(),
        },
      },
      paginate: vi.fn(),
    };

    const gateway = new OctokitRemediationGateway({
      octokit: octokit as never,
    });

    const pull = await gateway.createDraftPullRequest(snapshot, {
      branchName: "techdebtter/remediate-abc123",
      baseBranch: "main",
      title: "Upgrade lodash",
      body: "body",
      mutations: [
        {
          path: "package.json",
          previousContent: "{}",
          nextContent: '{"dependencies":{"lodash":"4.17.22"}}',
        },
      ],
      labels: ["techdebtter", "ready-for-agent"],
    });

    expect(pull.number).toBe(42);
    expect(pull.draft).toBe(true);
    expect(octokit.rest.git.createBlob).toHaveBeenCalledOnce();
    expect(octokit.rest.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true }),
    );
    expect(octokit.rest.issues.addLabels).toHaveBeenCalledOnce();
  });

  it("marks required checks from configured names", async () => {
    const octokit = {
      rest: {
        git: {},
        pulls: {},
        issues: {},
        checks: {
          listForRef: vi.fn(async () => ({
            data: {
              check_runs: [
                {
                  name: "check",
                  status: "completed",
                  conclusion: "success",
                },
                {
                  name: "optional",
                  status: "completed",
                  conclusion: "failure",
                },
              ],
            },
          })),
        },
        repos: {
          getBranchProtection: vi.fn(),
        },
      },
      paginate: vi.fn(),
    };

    const gateway = new OctokitRemediationGateway({
      octokit: octokit as never,
      requiredCheckNames: ["check"],
    });

    const checks = await gateway.listCheckRuns(snapshot, "c".repeat(40));
    expect(checks).toEqual([
      {
        name: "check",
        status: "completed",
        conclusion: "success",
        required: true,
      },
      {
        name: "optional",
        status: "completed",
        conclusion: "failure",
        required: false,
      },
    ]);
  });
});
