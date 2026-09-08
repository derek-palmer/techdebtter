import type { AnalysisReport, RepositorySnapshot } from "../domain/model.js";
import type { FindingVerificationGateway } from "../domain/ports.js";
import type { EffectivePolicy } from "../domain/policy.js";
import type { RemediationGateway } from "../domain/remediation.js";
import {
  observeRemediationPullRequest,
  type RemediationResult,
} from "./remediate.js";

export interface VerificationResult {
  closed: Array<{
    issueNumber: number;
    issueUrl: string;
    findingFingerprint: string;
  }>;
  remaining: Array<{
    issueNumber: number;
    issueUrl: string;
    findingFingerprint: string;
  }>;
  warnings: string[];
}

/**
 * Close Finding Issues whose fingerprints are absent from the latest
 * Analysis Report. Merge alone is never proof of remediation.
 */
export async function verifyRemediatedFindings(
  report: AnalysisReport,
  gateway: FindingVerificationGateway,
): Promise<VerificationResult> {
  if (!report.reproducible) {
    return {
      closed: [],
      remaining: [],
      warnings: [
        "Non-reproducible reports cannot verify remediation; commit and reanalyze",
      ],
    };
  }

  const present = new Set(report.findings.map((finding) => finding.fingerprint));
  const openIssues = await gateway.listOpenFindingIssues(report.snapshot);
  const closed: VerificationResult["closed"] = [];
  const remaining: VerificationResult["remaining"] = [];

  for (const issue of openIssues) {
    if (present.has(issue.findingFingerprint)) {
      remaining.push(issue);
      continue;
    }
    const closedIssue = await gateway.closeIssueAsRemediated(
      report.snapshot,
      issue.issueNumber,
    );
    closed.push({
      issueNumber: closedIssue.issueNumber,
      issueUrl: closedIssue.issueUrl,
      findingFingerprint: issue.findingFingerprint,
    });
  }

  return { closed, remaining, warnings: [] };
}

export async function observeAndPromote(
  snapshot: RepositorySnapshot,
  pullRequestNumber: number,
  gateway: RemediationGateway,
  policy: Pick<EffectivePolicy, "remediation">,
  headSha?: string,
): Promise<RemediationResult> {
  const pull = await gateway.getPullRequest(snapshot, pullRequestNumber);
  return observeRemediationPullRequest(
    snapshot,
    pullRequestNumber,
    headSha ?? pull.headSha,
    gateway,
    policy,
  );
}

export interface ObserveBatchResult {
  results: Array<{
    pullRequestNumber: number;
    url: string;
    result: RemediationResult;
  }>;
}

/**
 * Observe every open TechDebtter remediation PR and promote drafts whose
 * required checks passed. Non-draft PRs are skipped.
 */
export async function observeOpenRemediationPullRequests(
  snapshot: RepositorySnapshot,
  gateway: RemediationGateway,
  policy: Pick<EffectivePolicy, "remediation">,
): Promise<ObserveBatchResult> {
  const open = await gateway.listOpenRemediationPullRequests(snapshot);
  const results: ObserveBatchResult["results"] = [];

  for (const pull of open) {
    if (!pull.draft) {
      results.push({
        pullRequestNumber: pull.number,
        url: pull.url,
        result: {
          status: "promoted",
          pullRequest: {
            number: pull.number,
            url: pull.url,
            draft: false,
          },
          warnings: ["Pull request is already ready for review"],
        },
      });
      continue;
    }

    const result = await observeRemediationPullRequest(
      snapshot,
      pull.number,
      pull.headSha,
      gateway,
      policy,
    );
    results.push({
      pullRequestNumber: pull.number,
      url: pull.url,
      result,
    });
  }

  return { results };
}
