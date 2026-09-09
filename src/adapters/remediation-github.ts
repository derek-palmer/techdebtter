import type { Octokit } from "@octokit/rest";
import type { RepositorySnapshot } from "../domain/model.js";
import type {
  CheckRunSummary,
  FileMutation,
  PullRequestRecord,
  RemediationGateway,
} from "../domain/remediation.js";

const REMEDIATION_LABEL = "techdebtter";

export interface OctokitRemediationGatewayOptions {
  octokit: Octokit;
  /** When set, only these check names count as required. Otherwise branch protection is queried. */
  requiredCheckNames?: string[];
}

/**
 * GitHub-backed RemediationGateway. Creates draft PRs from static file
 * mutations without executing target-repository code.
 */
export class OctokitRemediationGateway implements RemediationGateway {
  private readonly octokit: Octokit;
  private readonly requiredCheckNames: string[] | undefined;

  constructor(options: OctokitRemediationGatewayOptions) {
    this.octokit = options.octokit;
    this.requiredCheckNames = options.requiredCheckNames;
  }

  async listOpenRemediationPullRequests(
    snapshot: RepositorySnapshot,
  ): Promise<PullRequestRecord[]> {
    const pulls = await this.octokit.paginate(this.octokit.rest.pulls.list, {
      owner: snapshot.owner,
      repo: snapshot.repo,
      state: "open",
      per_page: 100,
    });

    return pulls
      .filter((pull) =>
        (pull.labels ?? []).some((label) => label.name === REMEDIATION_LABEL),
      )
      .filter((pull) => Boolean(pull.head.ref.startsWith("techdebtter/remediate-")))
      .map((pull) => toPullRequestRecord(pull));
  }

  async getPullRequest(
    snapshot: RepositorySnapshot,
    pullRequestNumber: number,
  ): Promise<PullRequestRecord> {
    const { data: pull } = await this.octokit.rest.pulls.get({
      owner: snapshot.owner,
      repo: snapshot.repo,
      pull_number: pullRequestNumber,
    });
    return toPullRequestRecord(pull);
  }

  async createDraftPullRequest(
    snapshot: RepositorySnapshot,
    input: {
      branchName: string;
      baseBranch: string;
      title: string;
      body: string;
      mutations: FileMutation[];
      labels: string[];
    },
  ): Promise<PullRequestRecord> {
    const { data: baseRef } = await this.octokit.rest.git.getRef({
      owner: snapshot.owner,
      repo: snapshot.repo,
      ref: `heads/${input.baseBranch}`,
    });
    const baseSha = baseRef.object.sha;

    const { data: baseCommit } = await this.octokit.rest.git.getCommit({
      owner: snapshot.owner,
      repo: snapshot.repo,
      commit_sha: baseSha,
    });

    const treeItems = [];
    for (const mutation of input.mutations) {
      const { data: blob } = await this.octokit.rest.git.createBlob({
        owner: snapshot.owner,
        repo: snapshot.repo,
        content: Buffer.from(mutation.nextContent, "utf8").toString("base64"),
        encoding: "base64",
      });
      treeItems.push({
        path: mutation.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      });
    }

    const { data: tree } = await this.octokit.rest.git.createTree({
      owner: snapshot.owner,
      repo: snapshot.repo,
      base_tree: baseCommit.tree.sha,
      tree: treeItems,
    });

    const { data: commit } = await this.octokit.rest.git.createCommit({
      owner: snapshot.owner,
      repo: snapshot.repo,
      message: input.title,
      tree: tree.sha,
      parents: [baseSha],
    });

    await this.octokit.rest.git.createRef({
      owner: snapshot.owner,
      repo: snapshot.repo,
      ref: `refs/heads/${input.branchName}`,
      sha: commit.sha,
    });

    const { data: pull } = await this.octokit.rest.pulls.create({
      owner: snapshot.owner,
      repo: snapshot.repo,
      title: input.title,
      head: input.branchName,
      base: input.baseBranch,
      body: input.body,
      draft: true,
    });

    if (input.labels.length > 0) {
      await this.octokit.rest.issues.addLabels({
        owner: snapshot.owner,
        repo: snapshot.repo,
        issue_number: pull.number,
        labels: input.labels,
      });
    }

    return toPullRequestRecord(pull);
  }

  async listCheckRuns(
    snapshot: RepositorySnapshot,
    headSha: string,
  ): Promise<CheckRunSummary[]> {
    const requiredNames = await this.resolveRequiredCheckNames(
      snapshot,
      // Prefer base branch protection names when available.
    );

    const { data } = await this.octokit.rest.checks.listForRef({
      owner: snapshot.owner,
      repo: snapshot.repo,
      ref: headSha,
      per_page: 100,
    });

    return data.check_runs.map((run) => ({
      name: run.name,
      status: run.status as CheckRunSummary["status"],
      conclusion: (run.conclusion ?? null) as CheckRunSummary["conclusion"],
      required: requiredNames.has(run.name),
    }));
  }

  async markPullRequestReady(
    snapshot: RepositorySnapshot,
    pullRequestNumber: number,
  ): Promise<PullRequestRecord> {
    const { data: pull } = await this.octokit.rest.pulls.update({
      owner: snapshot.owner,
      repo: snapshot.repo,
      pull_number: pullRequestNumber,
      draft: false,
    });
    return toPullRequestRecord(pull);
  }

  private async resolveRequiredCheckNames(
    snapshot: RepositorySnapshot,
  ): Promise<Set<string>> {
    if (this.requiredCheckNames) {
      return new Set(this.requiredCheckNames);
    }

    try {
      const { data } = await this.octokit.rest.repos.getBranchProtection({
        owner: snapshot.owner,
        repo: snapshot.repo,
        branch: "main",
      });
      const contexts = data.required_status_checks?.contexts ?? [];
      const checks = data.required_status_checks?.checks?.map((check) => check.context) ?? [];
      return new Set([...contexts, ...checks]);
    } catch {
      // Missing protection or insufficient permission: treat no checks as required
      // so promotion stays blocked (safer default).
      return new Set();
    }
  }
}

function toPullRequestRecord(pull: {
  number: number;
  html_url: string;
  draft?: boolean;
  title: string;
  created_at: string;
  labels?: Array<{ name?: string | null } | string>;
  head: { sha: string };
}): PullRequestRecord {
  return {
    number: pull.number,
    url: pull.html_url,
    draft: Boolean(pull.draft),
    headSha: pull.head.sha,
    title: pull.title,
    createdAt: pull.created_at,
    labels: (pull.labels ?? []).map((label) =>
      typeof label === "string" ? label : (label.name ?? ""),
    ).filter(Boolean),
  };
}
