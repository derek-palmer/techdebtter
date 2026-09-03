import type { Finding, RepositorySnapshot } from "../domain/model.js";
import type { EffectivePolicy } from "../domain/policy.js";

export interface FileMutation {
  path: string;
  previousContent: string;
  nextContent: string;
}

export interface RemediationPlan {
  findingFingerprint: string;
  selectionId: string;
  summary: string;
  mutations: FileMutation[];
  validation: {
    kind: "static";
    commands: string[];
    notes: string[];
  };
  rollback: {
    summary: string;
    mutations: FileMutation[];
  };
}

export interface Remediator {
  readonly id: string;
  supports(finding: Finding): boolean;
  plan(
    finding: Finding,
    root: string,
    snapshot: RepositorySnapshot,
  ): Promise<RemediationPlan>;
}

export interface PullRequestRecord {
  number: number;
  url: string;
  draft: boolean;
  headSha: string;
  title: string;
  createdAt: string;
  labels: string[];
}

export interface CheckRunSummary {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  required: boolean;
}

export interface RemediationBudgetState {
  openPullRequests: number;
  lastCreatedAt?: string;
  available: boolean;
  reasons: string[];
}

export interface RemediationGateway {
  listOpenRemediationPullRequests(
    snapshot: RepositorySnapshot,
  ): Promise<PullRequestRecord[]>;
  createDraftPullRequest(
    snapshot: RepositorySnapshot,
    input: {
      branchName: string;
      baseBranch: string;
      title: string;
      body: string;
      mutations: FileMutation[];
      labels: string[];
    },
  ): Promise<PullRequestRecord>;
  listCheckRuns(
    snapshot: RepositorySnapshot,
    headSha: string,
  ): Promise<CheckRunSummary[]>;
  markPullRequestReady(
    snapshot: RepositorySnapshot,
    pullRequestNumber: number,
  ): Promise<PullRequestRecord>;
}

export function evaluateRemediationBudget(
  policy: Pick<EffectivePolicy, "remediation">,
  openPullRequests: PullRequestRecord[],
  now: Date,
): RemediationBudgetState {
  const reasons: string[] = [];
  if (!policy.remediation.allowed || !policy.remediation.enabled) {
    reasons.push("Remediation is disabled by policy");
  }

  const openCount = openPullRequests.length;
  if (openCount >= policy.remediation.maxOpenPullRequests) {
    reasons.push(
      `Open remediation PR budget exhausted (${openCount}/${policy.remediation.maxOpenPullRequests})`,
    );
  }

  const newest = openPullRequests
    .map((pr) => pr.createdAt)
    .sort()
    .at(-1);
  if (newest) {
    const elapsedHours =
      (now.getTime() - new Date(newest).getTime()) / (1000 * 60 * 60);
    if (elapsedHours < policy.remediation.minHoursBetweenPullRequests) {
      reasons.push(
        `Remediation cadence not met; last PR opened ${elapsedHours.toFixed(1)}h ago`,
      );
    }
  }

  return {
    openPullRequests: openCount,
    ...(newest ? { lastCreatedAt: newest } : {}),
    available: reasons.length === 0,
    reasons,
  };
}

export function selectRequiredCheckOutcome(
  checks: CheckRunSummary[],
): "passed" | "failed" | "pending" | "missing" {
  const required = checks.filter((check) => check.required);
  if (required.length === 0) {
    return "missing";
  }
  if (required.some((check) => check.status !== "completed")) {
    return "pending";
  }
  if (
    required.some(
      (check) =>
        check.conclusion !== "success" && check.conclusion !== "skipped",
    )
  ) {
    return "failed";
  }
  return "passed";
}
