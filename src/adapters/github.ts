import { createHash } from "node:crypto";
import type { Octokit } from "@octokit/rest";
import type {
  Evidence,
  Finding,
  FindingClass,
  PublicationResult,
  RemediationRoute,
  RepositorySnapshot,
} from "../domain/model.js";
import type { GitHubGateway } from "../domain/ports.js";

const METADATA_MARKER = "techdebtter-metadata";
const METADATA_VERSION = "1.0.0";
const BASE_LABEL = "techdebtter";

const CLASS_LABELS: Record<FindingClass, string> = {
  vulnerability: "techdebtter:vulnerability",
  debt: "techdebtter:debt",
  defect: "techdebtter:defect",
};

const CRITICALITY_LABELS = {
  critical: "techdebtter:critical",
  high: "techdebtter:high",
  medium: "techdebtter:medium",
  low: "techdebtter:low",
} as const;

const ROUTE_LABELS: Record<RemediationRoute, string> = {
  "needs-triage": "needs-triage",
  "needs-info": "needs-info",
  "ready-for-agent": "ready-for-agent",
  "ready-for-human": "ready-for-human",
};

const MANAGED_LABEL_PREFIXES = [
  BASE_LABEL,
  "techdebtter:",
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
];

export interface TechDebtterIssueMetadata {
  schemaVersion: string;
  reportHash: string;
  snapshotSha: string;
  findingFingerprint: string;
  detectionFingerprints: string[];
  provenance: {
    generatedAt: string;
    policyVerified: boolean;
    policySources: string[];
  };
  suppression: {
    state: "active";
    closedAt: string;
    reason: "not_planned";
  } | null;
  evidenceDigest: string;
}

export interface GitHubIssueRecord {
  number: number;
  state: "open" | "closed";
  state_reason?: "completed" | "not_planned" | "reopened" | "duplicate" | null;
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
  html_url: string;
  closed_at?: string | null;
}

export interface OctokitGitHubGatewayOptions {
  octokit: Octokit;
  labelMap?: Record<string, string>;
  now?: () => string;
}

export class OctokitGitHubGateway implements GitHubGateway {
  private readonly octokit: Octokit;
  private readonly labelMap: Record<string, string>;
  private readonly now: () => string;
  private readonly ensuredLabels = new Set<string>();

  constructor(options: OctokitGitHubGatewayOptions) {
    this.octokit = options.octokit;
    this.labelMap = options.labelMap ?? {};
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async readOrganizationPolicy(
    owner: string,
  ): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }> {
    return readPolicyFile(this.octokit, owner, ".github", ".techdebtter.yml");
  }

  async readRepositoryPolicy(
    snapshot: RepositorySnapshot,
  ): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }> {
    return readPolicyFile(
      this.octokit,
      snapshot.owner,
      snapshot.repo,
      ".techdebtter.yml",
    );
  }

  async reconcileFinding(
    snapshot: RepositorySnapshot,
    finding: Finding,
    reportHash: string,
  ): Promise<PublicationResult["published"][number]> {
    const labels = buildSemanticLabels(finding);
    await this.ensureLabels(snapshot.owner, snapshot.repo, labels);

    const existingIssues = await listTechDebtterIssues(
      this.octokit,
      snapshot.owner,
      snapshot.repo,
    );
    const metadata = buildMetadata(snapshot, finding, reportHash, this.now);
    const matchingIssue = findIssueByFingerprint(
      existingIssues,
      finding.fingerprint,
    );

    if (!matchingIssue) {
      return this.createIssue(snapshot, finding, metadata, labels);
    }

    const parsed = parseMetadata(matchingIssue.body);
    if (
      matchingIssue.state === "closed" &&
      matchingIssue.state_reason === "not_planned"
    ) {
      if (
        parsed &&
        parsed.evidenceDigest === metadata.evidenceDigest &&
        parsed.findingFingerprint === finding.fingerprint
      ) {
        return {
          selectionId: finding.selectionId,
          issueNumber: matchingIssue.number,
          issueUrl: matchingIssue.html_url,
          action: "suppressed",
        };
      }
    }

    if (
      matchingIssue.state === "closed" &&
      matchingIssue.state_reason !== "not_planned"
    ) {
      return this.reopenIssue(
        snapshot,
        finding,
        metadata,
        labels,
        matchingIssue,
      );
    }

    return this.updateIssue(
      snapshot,
      finding,
      metadata,
      labels,
      matchingIssue,
    );
  }

  private async createIssue(
    snapshot: RepositorySnapshot,
    finding: Finding,
    metadata: TechDebtterIssueMetadata,
    labels: string[],
  ): Promise<PublicationResult["published"][number]> {
    const response = await this.octokit.rest.issues.create({
      owner: snapshot.owner,
      repo: snapshot.repo,
      title: finding.title,
      body: renderIssueBody(finding, metadata),
      labels: labels.map((label) => this.mapLabel(label)),
    });

    return {
      selectionId: finding.selectionId,
      issueNumber: response.data.number,
      issueUrl: response.data.html_url,
      action: "created",
    };
  }

  private async updateIssue(
    snapshot: RepositorySnapshot,
    finding: Finding,
    metadata: TechDebtterIssueMetadata,
    labels: string[],
    issue: GitHubIssueRecord,
  ): Promise<PublicationResult["published"][number]> {
    const response = await this.octokit.rest.issues.update({
      owner: snapshot.owner,
      repo: snapshot.repo,
      issue_number: issue.number,
      title: finding.title,
      body: renderIssueBody(finding, metadata),
      labels: mergeIssueLabels(issue.labels, labels, this.labelMap),
    });

    return {
      selectionId: finding.selectionId,
      issueNumber: response.data.number,
      issueUrl: response.data.html_url,
      action: "updated",
    };
  }

  private async reopenIssue(
    snapshot: RepositorySnapshot,
    finding: Finding,
    metadata: TechDebtterIssueMetadata,
    labels: string[],
    issue: GitHubIssueRecord,
  ): Promise<PublicationResult["published"][number]> {
    const response = await this.octokit.rest.issues.update({
      owner: snapshot.owner,
      repo: snapshot.repo,
      issue_number: issue.number,
      state: "open",
      state_reason: "reopened",
      title: finding.title,
      body: renderIssueBody(finding, metadata),
      labels: mergeIssueLabels(issue.labels, labels, this.labelMap),
    });

    return {
      selectionId: finding.selectionId,
      issueNumber: response.data.number,
      issueUrl: response.data.html_url,
      action: "reopened",
    };
  }

  private async ensureLabels(
    owner: string,
    repo: string,
    labels: string[],
  ): Promise<void> {
    for (const semanticLabel of labels) {
      const label = this.mapLabel(semanticLabel);
      const cacheKey = `${owner}/${repo}/${label}`;
      if (this.ensuredLabels.has(cacheKey)) {
        continue;
      }

      try {
        await this.octokit.rest.issues.createLabel({
          owner,
          repo,
          name: label,
          color: labelColor(label),
          description: labelDescription(label),
        });
      } catch (error) {
        if (!isExistingLabelError(error)) {
          throw error;
        }
      }

      this.ensuredLabels.add(cacheKey);
    }
  }

  private mapLabel(semanticLabel: string): string {
    return this.labelMap[semanticLabel] ?? semanticLabel;
  }
}

async function readPolicyFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    if (!("content" in response.data) || response.data.type !== "file") {
      return { state: "unverifiable" };
    }
    const text = Buffer.from(response.data.content, "base64").toString("utf8");
    return { state: "present", text };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { state: "absent" };
    }
    return { state: "unverifiable" };
  }
}

async function listTechDebtterIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GitHubIssueRecord[]> {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    labels: BASE_LABEL,
    state: "all",
    per_page: 100,
  });

  return issues
    .filter((issue) => !("pull_request" in issue && issue.pull_request))
    .map((issue) => ({
      number: issue.number,
      state: issue.state as "open" | "closed",
      state_reason: issue.state_reason ?? null,
      title: issue.title,
      body: issue.body ?? null,
      labels: issue.labels.map((label) =>
        typeof label === "string" ? { name: label } : { name: label.name ?? "" },
      ),
      html_url: issue.html_url,
      closed_at: issue.closed_at,
    }));
}

export function findIssueByFingerprint(
  issues: GitHubIssueRecord[],
  fingerprint: string,
): GitHubIssueRecord | undefined {
  for (const issue of issues) {
    const metadata = parseMetadata(issue.body);
    if (metadata?.findingFingerprint === fingerprint) {
      return issue;
    }
  }
  return undefined;
}

export function parseMetadata(
  body: string | null | undefined,
): TechDebtterIssueMetadata | undefined {
  if (!body) {
    return undefined;
  }

  const pattern = new RegExp(
    `<!--\\s*${METADATA_MARKER}:${METADATA_VERSION}\\s*([\\s\\S]*?)-->`,
    "m",
  );
  const match = body.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(match[1].trim()) as TechDebtterIssueMetadata;
    if (
      typeof parsed.findingFingerprint !== "string" ||
      typeof parsed.reportHash !== "string" ||
      typeof parsed.snapshotSha !== "string"
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function buildMetadata(
  snapshot: RepositorySnapshot,
  finding: Finding,
  reportHash: string,
  now: () => string = () => new Date().toISOString(),
): TechDebtterIssueMetadata {
  return {
    schemaVersion: METADATA_VERSION,
    reportHash,
    snapshotSha: snapshot.commitSha,
    findingFingerprint: finding.fingerprint,
    detectionFingerprints: finding.detectionFingerprints,
    provenance: {
      generatedAt: now(),
      policyVerified: true,
      policySources: [],
    },
    suppression: null,
    evidenceDigest: computeEvidenceDigest(finding.evidence),
  };
}

export function computeEvidenceDigest(evidence: Evidence[]): string {
  return createHash("sha256")
    .update(JSON.stringify(evidence), "utf8")
    .digest("hex");
}

export function buildSemanticLabels(finding: Finding): string[] {
  return [
    BASE_LABEL,
    CLASS_LABELS[finding.class],
    CRITICALITY_LABELS[finding.effectiveCriticality],
    ROUTE_LABELS[finding.route],
  ];
}

export function renderIssueBody(
  finding: Finding,
  metadata: TechDebtterIssueMetadata,
): string {
  const lines = [
    "## Finding",
    "",
    finding.title,
    "",
    `**Criticality:** ${finding.effectiveCriticality}`,
    `**Route:** ${finding.route}`,
    "",
    "## Criticality reasons",
    "",
    ...finding.criticalityReasons.map((reason) => `- ${reason}`),
    "",
    "## Evidence",
    "",
    ...finding.evidence.map(
      (item) =>
        `- ${item.kind} (${item.source}) ${item.subject}: ${String(item.value)}`,
    ),
    "",
    renderMetadataComment(metadata),
  ];

  return lines.join("\n");
}

export function renderMetadataComment(
  metadata: TechDebtterIssueMetadata,
): string {
  return `<!-- ${METADATA_MARKER}:${METADATA_VERSION}\n${JSON.stringify(metadata, null, 2)}\n-->`;
}

export function mergeIssueLabels(
  existing: Array<{ name: string }>,
  semanticLabels: string[],
  labelMap: Record<string, string>,
): string[] {
  const mapped = semanticLabels.map((label) => labelMap[label] ?? label);
  const preserved = existing
    .map((label) => label.name)
    .filter(
      (name) =>
        !MANAGED_LABEL_PREFIXES.some(
          (prefix) => name === prefix || name.startsWith(prefix),
        ),
    );

  return [...new Set([...preserved, ...mapped])];
}

function labelColor(label: string): string {
  if (label.includes("critical")) {
    return "b60205";
  }
  if (label.includes("high")) {
    return "d93f0b";
  }
  if (label.includes("medium")) {
    return "fbca04";
  }
  if (label.includes("low")) {
    return "0e8a16";
  }
  return "5319e7";
}

function labelDescription(label: string): string {
  return `Managed by TechDebtter (${label})`;
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

function isExistingLabelError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 422
  );
}
