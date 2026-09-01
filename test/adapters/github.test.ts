import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { activeGhToken, redactToken } from "../../src/adapters/gh-auth.js";
import type { GhAuthError } from "../../src/adapters/gh-auth.js";
import type { ProcessRunner } from "../../src/adapters/process.js";
import {
  OctokitGitHubGateway,
  buildSemanticLabels,
  computeEvidenceDigest,
  findIssueByFingerprint,
  parseMetadata,
  renderIssueBody,
  renderMetadataComment,
  type GitHubIssueRecord,
  type TechDebtterIssueMetadata,
} from "../../src/adapters/github.js";
import type { Finding, RepositorySnapshot } from "../../src/domain/model.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/github/issues.json",
);
const fixtureIssues = JSON.parse(
  readFileSync(fixturePath, "utf8"),
) as GitHubIssueRecord[];

const snapshot: RepositorySnapshot = {
  owner: "acme",
  repo: "api",
  commitSha: "a".repeat(40),
  dirty: false,
};

const finding: Finding = {
  selectionId: "abc123def456",
  fingerprint: "abc123def4567890abc123def4567890abc123def4567890abc123def4567890",
  detectionFingerprints: ["det-1"],
  class: "vulnerability",
  title: "lodash@4.17.21: CVE-2026-0001",
  calculatedCriticality: "critical",
  effectiveCriticality: "critical",
  criticalityReasons: ["CISA KEV confirms relevant exploitation evidence from cisa-kev"],
  route: "ready-for-agent",
  evidence: [
    {
      kind: "detector",
      source: "trivy-vulnerability",
      observedAt: "2026-08-31T12:00:00.000Z",
      subject: "raw-result",
      value: "fixture-hash",
    },
  ],
};

describe("activeGhToken", () => {
  it("requires gh auth status before gh auth token", async () => {
    const calls: string[] = [];
    const runner: ProcessRunner = {
      async run(command, args) {
        calls.push(`${command} ${args.join(" ")}`);
        if (args[0] === "auth" && args[1] === "status") {
          return { stdout: "logged in", stderr: "", exitCode: 0 };
        }
        if (args[0] === "auth" && args[1] === "token") {
          return { stdout: "gho_test_token\n", stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "unexpected", exitCode: 1 };
      },
    };

    const token = await activeGhToken(runner);

    expect(token).toBe("gho_test_token");
    expect(calls).toEqual(["gh auth status", "gh auth token"]);
  });

  it("trims the token", async () => {
    const runner: ProcessRunner = {
      async run(_command, args) {
        if (args[1] === "status") {
          return { stdout: "", stderr: "", exitCode: 0 };
        }
        return { stdout: "  gho_trimmed  \n", stderr: "", exitCode: 0 };
      },
    };

    await expect(activeGhToken(runner)).resolves.toBe("gho_trimmed");
  });

  it("fails when gh auth status fails without leaking token attempts", async () => {
    const runner: ProcessRunner = {
      async run(_command, args) {
        if (args[1] === "status") {
          return {
            stdout: "",
            stderr: "not logged in",
            exitCode: 1,
          };
        }
        return { stdout: "gho_secret", stderr: "", exitCode: 0 };
      },
    };

    await expect(activeGhToken(runner)).rejects.toMatchObject({
      code: "gh-not-authenticated",
    } satisfies Partial<GhAuthError>);
  });

  it("never includes the token in thrown errors", async () => {
    const secret = "gho_super_secret_token_value";
    const runner: ProcessRunner = {
      async run(_command, args) {
        if (args[1] === "status") {
          return { stdout: "", stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: secret, exitCode: 1 };
      },
    };

    await expect(activeGhToken(runner)).rejects.toSatisfy((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return !message.includes(secret);
    });
  });
});

describe("redactToken", () => {
  it("replaces token substrings with a redacted marker", () => {
    const token = "gho_secret";
    expect(redactToken(`Bearer ${token}`, token)).toBe("Bearer [REDACTED]");
  });
});

describe("github issue rendering", () => {
  it("builds semantic labels for class, criticality, and route", () => {
    expect(buildSemanticLabels(finding)).toEqual([
      "techdebtter",
      "techdebtter:vulnerability",
      "techdebtter:critical",
      "ready-for-agent",
    ]);
  });

  it("renders one hidden metadata HTML comment with required fields", () => {
    const metadata: TechDebtterIssueMetadata = {
      schemaVersion: "1.0.0",
      reportHash: "b".repeat(64),
      snapshotSha: snapshot.commitSha,
      findingFingerprint: finding.fingerprint,
      detectionFingerprints: finding.detectionFingerprints,
      provenance: {
        generatedAt: "2026-08-31T12:00:00.000Z",
        policyVerified: true,
        policySources: ["product-defaults"],
      },
      suppression: null,
      evidenceDigest: computeEvidenceDigest(finding.evidence),
    };

    const body = renderIssueBody(finding, metadata);
    const comment = renderMetadataComment(metadata);

    expect(body).toContain(finding.title);
    expect(body).toContain(comment);
    expect(body.match(/<!-- techdebtter-metadata:1\.0\.0[\s\S]*-->/g)).toHaveLength(1);

    const parsed = parseMetadata(body);
    expect(parsed).toMatchObject({
      schemaVersion: "1.0.0",
      reportHash: metadata.reportHash,
      snapshotSha: snapshot.commitSha,
      findingFingerprint: finding.fingerprint,
      detectionFingerprints: ["det-1"],
      evidenceDigest: metadata.evidenceDigest,
    });
  });

  it("parses valid fixture metadata and ignores invalid bodies", () => {
    const parsed = parseMetadata(fixtureIssues[0]?.body);
    expect(parsed?.findingFingerprint).toBe(finding.fingerprint);
    expect(parseMetadata("no metadata here")).toBeUndefined();
  });

  it("finds issues by fingerprint metadata, not title", () => {
    const issues: GitHubIssueRecord[] = [
      {
        number: 1,
        state: "open",
        title: finding.title,
        body: "missing metadata",
        labels: [],
        html_url: "https://github.com/acme/api/issues/1",
      },
      fixtureIssues[0] as GitHubIssueRecord,
    ];

    expect(findIssueByFingerprint(issues, finding.fingerprint)?.number).toBe(42);
  });
});

describe("OctokitGitHubGateway", () => {
  it("reads organization policy from the .github repository", async () => {
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: "file",
        content: Buffer.from("scan:\n  enabled: true\n", "utf8").toString("base64"),
      },
    });
    const gateway = new OctokitGitHubGateway({
      octokit: { rest: { repos: { getContent } } } as never,
    });

    await expect(gateway.readOrganizationPolicy("acme")).resolves.toEqual({
      state: "present",
      text: "scan:\n  enabled: true\n",
    });
    expect(getContent).toHaveBeenCalledWith({
      owner: "acme",
      repo: ".github",
      path: ".techdebtter.yml",
    });
  });

  it("returns absent when policy file is missing", async () => {
    const gateway = new OctokitGitHubGateway({
      octokit: {
        rest: {
          repos: {
            getContent: vi.fn().mockRejectedValue({ status: 404 }),
          },
        },
      } as never,
    });

    await expect(gateway.readRepositoryPolicy(snapshot)).resolves.toEqual({
      state: "absent",
    });
  });

  it("updates an open issue with the same fingerprint", async () => {
    const evidenceDigest = computeEvidenceDigest(finding.evidence);
    const issues = [fixtureIssues[0] as GitHubIssueRecord];
    const update = vi.fn().mockResolvedValue({
      data: {
        number: 42,
        html_url: "https://github.com/acme/api/issues/42",
      },
    });
    const createLabel = vi.fn().mockResolvedValue({});
    const gateway = new OctokitGitHubGateway({
      octokit: {
        paginate: vi.fn().mockResolvedValue(
          issues.map((issue) => ({
            ...issue,
            pull_request: undefined,
            labels: issue.labels,
          })),
        ),
        rest: {
          issues: {
            update,
            create: vi.fn(),
            createLabel,
            listForRepo: {},
          },
        },
      } as never,
      now: () => "2026-08-31T12:00:00.000Z",
    });

    const result = await gateway.reconcileFinding(snapshot, finding, "b".repeat(64));

    expect(result).toMatchObject({
      selectionId: finding.selectionId,
      issueNumber: 42,
      action: "updated",
    });
    expect(update).toHaveBeenCalledOnce();
    expect(createLabel).toHaveBeenCalled();
    const updatedBody = update.mock.calls[0]?.[0]?.body as string;
    expect(parseMetadata(updatedBody)?.evidenceDigest).toBe(evidenceDigest);
  });

  it("reopens a completed issue when the finding returns", async () => {
    const issues = [fixtureIssues[1] as GitHubIssueRecord];
    const update = vi.fn().mockResolvedValue({
      data: {
        number: 7,
        html_url: "https://github.com/acme/api/issues/7",
      },
    });
    const gateway = new OctokitGitHubGateway({
      octokit: {
        paginate: vi.fn().mockResolvedValue(
          issues.map((issue) => ({
            ...issue,
            pull_request: undefined,
            labels: issue.labels,
          })),
        ),
        rest: {
          issues: {
            update,
            create: vi.fn(),
            createLabel: vi.fn().mockResolvedValue({}),
            listForRepo: {},
          },
        },
      } as never,
      now: () => "2026-08-31T12:00:00.000Z",
    });

    const result = await gateway.reconcileFinding(snapshot, finding, "b".repeat(64));

    expect(result.action).toBe("reopened");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 7,
        state: "open",
        state_reason: "reopened",
      }),
    );
  });

  it("keeps suppressed issues closed when evidence is unchanged", async () => {
    const issues = [fixtureIssues[2] as GitHubIssueRecord];
    const update = vi.fn();
    const create = vi.fn();
    const gateway = new OctokitGitHubGateway({
      octokit: {
        paginate: vi.fn().mockResolvedValue(
          issues.map((issue) => ({
            ...issue,
            pull_request: undefined,
            labels: issue.labels,
          })),
        ),
        rest: {
          issues: {
            update,
            create,
            createLabel: vi.fn().mockResolvedValue({}),
            listForRepo: {},
          },
        },
      } as never,
      now: () => "2026-08-31T12:00:00.000Z",
    });

    const result = await gateway.reconcileFinding(snapshot, finding, "b".repeat(64));

    expect(result.action).toBe("suppressed");
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a new issue when no fingerprint match exists", async () => {
    const create = vi.fn().mockResolvedValue({
      data: {
        number: 100,
        html_url: "https://github.com/acme/api/issues/100",
      },
    });
    const gateway = new OctokitGitHubGateway({
      octokit: {
        paginate: vi.fn().mockResolvedValue([]),
        rest: {
          issues: {
            create,
            update: vi.fn(),
            createLabel: vi.fn().mockResolvedValue({}),
            listForRepo: {},
          },
        },
      } as never,
      now: () => "2026-08-31T12:00:00.000Z",
    });

    const unrelatedFinding = {
      ...finding,
      fingerprint: "f".repeat(64),
      selectionId: "newselection",
    };

    const result = await gateway.reconcileFinding(
      snapshot,
      unrelatedFinding,
      "b".repeat(64),
    );

    expect(result).toMatchObject({
      action: "created",
      issueNumber: 100,
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it("maps semantic labels through repository policy label aliases", async () => {
    const createLabel = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue({
      data: { number: 5, html_url: "https://github.com/acme/api/issues/5" },
    });
    const gateway = new OctokitGitHubGateway({
      octokit: {
        paginate: vi.fn().mockResolvedValue([]),
        rest: {
          issues: {
            create,
            update: vi.fn(),
            createLabel,
            listForRepo: {},
          },
        },
      } as never,
      labelMap: {
        "techdebtter:vulnerability": "security",
      },
      now: () => "2026-08-31T12:00:00.000Z",
    });

    await gateway.reconcileFinding(snapshot, finding, "b".repeat(64));

    expect(createLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "security" }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.arrayContaining(["security"]),
      }),
    );
  });

  it("is idempotent when publish reconciles the same finding twice", async () => {
    const issues: GitHubIssueRecord[] = [];
    const create = vi.fn().mockImplementation(async () => {
      const created: GitHubIssueRecord = {
        number: 200,
        state: "open",
        state_reason: null,
        title: finding.title,
        body: renderIssueBody(
          finding,
          {
            schemaVersion: "1.0.0",
            reportHash: "b".repeat(64),
            snapshotSha: snapshot.commitSha,
            findingFingerprint: finding.fingerprint,
            detectionFingerprints: finding.detectionFingerprints,
            provenance: {
              generatedAt: "2026-08-31T12:00:00.000Z",
              policyVerified: true,
              policySources: [],
            },
            suppression: null,
            evidenceDigest: computeEvidenceDigest(finding.evidence),
          },
        ),
        labels: buildSemanticLabels(finding).map((name) => ({ name })),
        html_url: "https://github.com/acme/api/issues/200",
        closed_at: null,
      };
      issues.push(created);
      return { data: { number: 200, html_url: created.html_url } };
    });
    const update = vi.fn().mockResolvedValue({
      data: { number: 200, html_url: "https://github.com/acme/api/issues/200" },
    });
    const gateway = new OctokitGitHubGateway({
      octokit: {
        paginate: vi.fn().mockImplementation(async () =>
          issues.map((issue) => ({
            ...issue,
            pull_request: undefined,
          })),
        ),
        rest: {
          issues: {
            create,
            update,
            createLabel: vi.fn().mockResolvedValue({}),
            listForRepo: {},
          },
        },
      } as never,
      now: () => "2026-08-31T12:00:00.000Z",
    });

    const first = await gateway.reconcileFinding(snapshot, finding, "b".repeat(64));
    const second = await gateway.reconcileFinding(snapshot, finding, "b".repeat(64));

    expect(first.action).toBe("created");
    expect(second.action).toBe("updated");
    expect(first.issueNumber).toBe(second.issueNumber);
    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });
});
