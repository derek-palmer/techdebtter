import type {
  Finding,
  OperatingScope,
  RepositorySnapshot,
} from "../domain/model.js";
import type { EffectivePolicy } from "../domain/policy.js";
import {
  evaluateRemediationBudget,
  selectRequiredCheckOutcome,
  type RemediationGateway,
  type RemediationPlan,
  type Remediator,
} from "../domain/remediation.js";
import { RemediationError } from "./remediation-error.js";

export interface RemediateDependencies {
  remediators: Remediator[];
  gateway: RemediationGateway;
  policy: EffectivePolicy;
  clock: { now: () => Date };
  baseBranch?: string;
}

export interface RemediationResult {
  status:
    | "created"
    | "budget-exhausted"
    | "unsupported"
    | "promoted"
    | "awaiting-ci"
    | "failed-ci";
  plan?: RemediationPlan;
  pullRequest?: {
    number: number;
    url: string;
    draft: boolean;
  };
  warnings: string[];
}

export async function remediate(
  finding: Finding,
  scope: OperatingScope,
  snapshot: RepositorySnapshot,
  dependencies: RemediateDependencies,
): Promise<RemediationResult> {
  if (finding.route !== "ready-for-agent") {
    return {
      status: "unsupported",
      warnings: [
        `Finding route ${finding.route} is not eligible for autonomous remediation`,
      ],
    };
  }

  const remediator = dependencies.remediators.find((candidate) =>
    candidate.supports(finding),
  );
  if (!remediator) {
    return {
      status: "unsupported",
      warnings: [`No remediator supports finding ${finding.selectionId}`],
    };
  }

  const open = await dependencies.gateway.listOpenRemediationPullRequests(
    snapshot,
  );
  const budget = evaluateRemediationBudget(
    dependencies.policy,
    open,
    dependencies.clock.now(),
  );
  if (!budget.available) {
    return {
      status: "budget-exhausted",
      warnings: budget.reasons,
    };
  }

  const plan = await remediator.plan(finding, scope.localPath, snapshot);
  const pullRequest = await dependencies.gateway.createDraftPullRequest(
    snapshot,
    {
      branchName: `techdebtter/remediate-${finding.selectionId}`,
      baseBranch: dependencies.baseBranch ?? "main",
      title: plan.summary,
      body: renderRemediationBody(finding, plan),
      mutations: plan.mutations,
      labels: ["techdebtter", "ready-for-agent"],
    },
  );

  return {
    status: "created",
    plan,
    pullRequest: {
      number: pullRequest.number,
      url: pullRequest.url,
      draft: pullRequest.draft,
    },
    warnings: [],
  };
}

export async function observeRemediationPullRequest(
  snapshot: RepositorySnapshot,
  pullRequestNumber: number,
  headSha: string,
  gateway: RemediationGateway,
  policy: Pick<EffectivePolicy, "remediation">,
): Promise<RemediationResult> {
  const checks = await gateway.listCheckRuns(snapshot, headSha);
  const outcome = selectRequiredCheckOutcome(checks);

  switch (outcome) {
    case "passed": {
      const pullRequest = await gateway.markPullRequestReady(
        snapshot,
        pullRequestNumber,
      );
      return {
        status: "promoted",
        pullRequest: {
          number: pullRequest.number,
          url: pullRequest.url,
          draft: pullRequest.draft,
        },
        warnings: [],
      };
    }
    case "pending":
      return {
        status: "awaiting-ci",
        pullRequest: {
          number: pullRequestNumber,
          url: "",
          draft: true,
        },
        warnings: ["Required checks are still running"],
      };
    case "missing":
      return {
        status: "failed-ci",
        pullRequest: {
          number: pullRequestNumber,
          url: "",
          draft: true,
        },
        warnings: [
          policy.remediation.allowStaticOnlyPromotion
            ? "Required checks missing; static-only promotion is policy-gated and not automatic"
            : "Required checks missing; leaving draft and routing to human",
        ],
      };
    case "failed":
      return {
        status: "failed-ci",
        pullRequest: {
          number: pullRequestNumber,
          url: "",
          draft: true,
        },
        warnings: [
          "Required checks failed; leaving draft without autonomous repair",
        ],
      };
    default: {
      const _exhaustive: never = outcome;
      throw new RemediationError(
        "unsupported-finding",
        `Unhandled check outcome: ${String(_exhaustive)}`,
      );
    }
  }
}

function renderRemediationBody(
  finding: Finding,
  plan: RemediationPlan,
): string {
  return [
    `## TechDebtter remediation`,
    "",
    plan.summary,
    "",
    `Finding: \`${finding.selectionId}\``,
    `Fingerprint: \`${finding.fingerprint}\``,
    "",
    "### Static validation",
    ...plan.validation.notes.map((note) => `- ${note}`),
    "",
    "### Suggested local commands (User Identity only)",
    ...plan.validation.commands.map((command) => `- \`${command}\``),
    "",
    "### Rollback",
    plan.rollback.summary,
    "",
    "<!-- techdebtter-remediation",
    JSON.stringify(
      {
        schemaVersion: "1.0.0",
        findingFingerprint: finding.fingerprint,
        selectionId: finding.selectionId,
        remediator: "npm-package-lock",
      },
      null,
      2,
    ),
    "-->",
  ].join("\n");
}
