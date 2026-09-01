import { describe, expect, it, vi } from "vitest";
import { withReportHash } from "../../src/application/report-hash.js";
import type { PublicationResult } from "../../src/domain/model.js";
import type { GitHubGateway } from "../../src/domain/ports.js";
import {
  EXIT_INVALID,
  EXIT_OPERATIONAL,
  EXIT_SUCCESS,
} from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";
import { captureIo, loadVerifiedReportFixture, writeReportFixture } from "./helpers.js";

describe("runCli publish", () => {
  it("requires explicit selection IDs", async () => {
    const captured = captureIo();
    const reportPath = writeReportFixture(loadVerifiedReportFixture());

    const exitCode = await runCli(
      ["node", "techdebtter", "publish", reportPath, "--yes"],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway: createGateway() },
        io: captured.io,
      },
    );

    expect(exitCode).not.toBe(EXIT_SUCCESS);
    expect(captured.stdout).toBe("");
  });

  it("publishes selected findings with --yes and emits JSON on stdout", async () => {
    const captured = captureIo();
    const report = loadVerifiedReportFixture();
    const reportPath = writeReportFixture(report);
    const gateway = createGateway();

    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "publish",
        reportPath,
        "--select",
        report.findings[0]!.selectionId,
        "--yes",
        "--format",
        "json",
      ],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway },
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_SUCCESS);
    const result = JSON.parse(captured.stdout) as PublicationResult;
    expect(result.published).toHaveLength(1);
    expect(result.published[0]?.action).toBe("created");
    expect(vi.mocked(gateway.reconcileFinding)).toHaveBeenCalledOnce();
  });

  it("summarizes intended writes and requires confirmation without --yes", async () => {
    const captured = captureIo();
    const report = loadVerifiedReportFixture();
    const reportPath = writeReportFixture(report);
    const gateway = createGateway();
    const confirm = vi.fn(async () => false);

    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "publish",
        reportPath,
        "--select",
        report.findings[0]!.selectionId,
      ],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway },
        confirm,
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_OPERATIONAL);
    expect(captured.stdout).toContain("Publish 1 finding(s) to acme/api");
    expect(captured.stdout).toContain(report.findings[0]!.selectionId);
    expect(confirm).toHaveBeenCalledOnce();
    expect(vi.mocked(gateway.reconcileFinding)).not.toHaveBeenCalled();
  });

  it("rejects unknown selection IDs with structured stderr", async () => {
    const captured = captureIo();
    const reportPath = writeReportFixture(loadVerifiedReportFixture());

    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "publish",
        reportPath,
        "--select",
        "missing-id",
        "--yes",
      ],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway: createGateway() },
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_INVALID);
    expect(captured.stdout).toBe("");
    expect(JSON.parse(captured.stderr)).toMatchObject({
      code: "unknown-selection",
    });
  });

  it("rejects non-reproducible reports", async () => {
    const captured = captureIo();
    const report = loadVerifiedReportFixture();
    const { reportHash: _, ...reportBody } = report;
    const nonReproducible = writeReportFixture(
      withReportHash({
        ...reportBody,
        reproducible: false,
        snapshot: { ...report.snapshot, dirty: true },
      }),
    );

    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "publish",
        nonReproducible,
        "--select",
        report.findings[0]!.selectionId,
        "--yes",
      ],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway: createGateway() },
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_INVALID);
    expect(JSON.parse(captured.stderr)).toMatchObject({
      code: "non-reproducible",
    });
  });

  it("refuses to publish without --yes in non-interactive mode", async () => {
    const captured = captureIo();
    const report = loadVerifiedReportFixture();
    const reportPath = writeReportFixture(report);

    const exitCode = await runCli(
      [
        "node",
        "techdebtter",
        "publish",
        reportPath,
        "--select",
        report.findings[0]!.selectionId,
      ],
      {
        dependencies: createAnalyzeDependencies(),
        publishDependencies: { gateway: createGateway() },
        io: captured.io,
      },
    );

    expect(exitCode).toBe(EXIT_INVALID);
    expect(JSON.parse(captured.stderr)).toMatchObject({
      code: "confirmation-required",
    });
  });
});

function createGateway(overrides: Partial<GitHubGateway> = {}): GitHubGateway {
  const reconcileFinding = vi.fn(async (_snapshot, finding) =>
    publishedEntry(finding.selectionId, 42, "created"),
  );
  return {
    readOrganizationPolicy: vi.fn(),
    readRepositoryPolicy: vi.fn(),
    reconcileFinding,
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

function createAnalyzeDependencies() {
  return {
    repositorySource: { async snapshot() { return { owner: "acme", repo: "api", commitSha: "a".repeat(40), dirty: false }; } },
    detectors: [],
    enrichmentProviders: [],
    readOrganizationPolicy: async () => ({ state: "absent" as const }),
    readRepositoryPolicy: async () => ({ state: "absent" as const }),
    clock: { now: () => new Date("2026-08-31T12:00:00.000Z") },
  };
}
