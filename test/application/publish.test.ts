import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { publish } from "../../src/application/publish.js";
import type { PublishError } from "../../src/application/publish-error.js";
import { withReportHash } from "../../src/application/report-hash.js";
import type {
  AnalysisReport,
  OperatingScope,
  PublicationResult,
} from "../../src/domain/model.js";
import type { GitHubGateway } from "../../src/domain/ports.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/reports/v1.json",
);
const baseReport = JSON.parse(readFileSync(fixturePath, "utf8")) as AnalysisReport;
const { reportHash: _fixtureHash, ...baseReportBody } = baseReport;

const verifiedReport: AnalysisReport = withReportHash({
  ...baseReportBody,
  policy: {
    verified: true,
    sources: ["product-defaults", "organization-absent", "repository-absent"],
  },
  warnings: [],
});

const unverifiedReport: AnalysisReport = withReportHash(baseReportBody);

const scope: OperatingScope = {
  organization: "acme",
  repositories: ["api"],
  localPath: "/tmp/repo",
  includeUncommitted: false,
};

describe("publish", () => {
  it("reconciles only selected findings through the gateway", async () => {
    const reconciled: string[] = [];
    const gateway = createGateway({
      reconcileFinding: vi.fn(async (_snapshot, finding) => {
        reconciled.push(finding.selectionId);
        return publishedEntry(finding.selectionId, 42, "created");
      }),
    });

    const result = await publish(
      verifiedReport,
      [verifiedReport.findings[0]!.selectionId],
      scope,
      { gateway },
    );

    expect(reconciled).toEqual([verifiedReport.findings[0]!.selectionId]);
    expect(result.published).toHaveLength(1);
    expect(gateway.reconcileFinding).toHaveBeenCalledOnce();
  });

  it("rejects unknown selection IDs", async () => {
    await expect(
      publish(verifiedReport, ["missing-id"], scope, {
        gateway: createGateway(),
      }),
    ).rejects.toMatchObject({
      code: "unknown-selection",
    } satisfies Partial<PublishError>);
  });

  it("rejects duplicate selection IDs", async () => {
    const selectionId = verifiedReport.findings[0]!.selectionId;
    await expect(
      publish(verifiedReport, [selectionId, selectionId], scope, {
        gateway: createGateway(),
      }),
    ).rejects.toMatchObject({
      code: "duplicate-selection",
    } satisfies Partial<PublishError>);
  });

  it("rejects non-reproducible reports", async () => {
    const { reportHash: _, ...verifiedBody } = verifiedReport;
    const nonReproducible = withReportHash({
      ...verifiedBody,
      reproducible: false,
      snapshot: { ...verifiedReport.snapshot, dirty: true },
    });
    await expect(
      publish(
        nonReproducible,
        [verifiedReport.findings[0]!.selectionId],
        scope,
        { gateway: createGateway() },
      ),
    ).rejects.toMatchObject({
      code: "non-reproducible",
    } satisfies Partial<PublishError>);
  });

  it("rejects reports with unverified organization policy", async () => {
    await expect(
      publish(unverifiedReport, [unverifiedReport.findings[0]!.selectionId], scope, {
        gateway: createGateway(),
      }),
    ).rejects.toMatchObject({
      code: "unverified-policy",
    } satisfies Partial<PublishError>);
  });

  it("rejects reports outside the operating scope", async () => {
    await expect(
      publish(verifiedReport, [verifiedReport.findings[0]!.selectionId], {
        ...scope,
        repositories: ["other-repo"],
      }, {
        gateway: createGateway(),
      }),
    ).rejects.toMatchObject({
      code: "scope-mismatch",
    } satisfies Partial<PublishError>);
  });

  it("rejects tampered report hashes", async () => {
    await expect(
      publish(
        {
          ...verifiedReport,
          reportHash: "0".repeat(64),
        },
        [verifiedReport.findings[0]!.selectionId],
        scope,
        { gateway: createGateway() },
      ),
    ).rejects.toMatchObject({
      code: "invalid-report",
    } satisfies Partial<PublishError>);
  });

  it("returns the same issue numbers when publication is retried", async () => {
    const gateway = createGateway({
      reconcileFinding: vi
        .fn()
        .mockResolvedValueOnce(publishedEntry("abc123def456", 42, "created"))
        .mockResolvedValueOnce(publishedEntry("abc123def456", 42, "updated")),
    });

    const selection = [verifiedReport.findings[0]!.selectionId];
    const first = await publish(verifiedReport, selection, scope, { gateway });
    const second = await publish(verifiedReport, selection, scope, { gateway });

    expect(first.published[0]?.issueNumber).toBe(42);
    expect(second.published[0]?.issueNumber).toBe(42);
    expect(second.published[0]?.action).toBe("updated");
  });
});

function createGateway(
  overrides: Partial<GitHubGateway> = {},
): GitHubGateway {
  return {
    readOrganizationPolicy: vi.fn(),
    readRepositoryPolicy: vi.fn(),
    reconcileFinding: vi.fn(async (_snapshot, finding) =>
      publishedEntry(finding.selectionId, 1, "created"),
    ),
    ...overrides,
  };
}

function publishedEntry(
  selectionId: string,
  issueNumber: number,
  action: PublicationResult["published"][number]["action"],
): PublicationResult["published"][number] {
  return {
    selectionId,
    issueNumber,
    issueUrl: `https://github.com/acme/api/issues/${issueNumber}`,
    action,
  };
}
