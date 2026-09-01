import type {
  AnalysisReport,
  Finding,
  OperatingScope,
  PublicationResult,
} from "../domain/model.js";
import type { GitHubGateway } from "../domain/ports.js";
import { computeReportHash } from "./report-hash.js";
import { createAnalysisReportValidator } from "./report-schema.js";
import { PublishError } from "./publish-error.js";

export interface PublishDependencies {
  gateway: GitHubGateway;
}

const validateReport = createAnalysisReportValidator();

export async function publish(
  report: AnalysisReport,
  selections: string[],
  scope: OperatingScope,
  dependencies: PublishDependencies,
): Promise<PublicationResult> {
  if (selections.length === 0) {
    throw new PublishError(
      "empty-selection",
      "At least one finding selection ID is required",
    );
  }

  if (!validateReport(report)) {
    throw new PublishError(
      "invalid-report",
      "Analysis report failed schema validation",
    );
  }

  const expectedHash = computeReportHash({
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    reproducible: report.reproducible,
    snapshot: report.snapshot,
    policy: report.policy,
    findings: report.findings,
    warnings: report.warnings,
  });
  if (report.reportHash !== expectedHash) {
    throw new PublishError(
      "invalid-report",
      "Analysis report hash does not match report contents",
    );
  }

  if (!report.reproducible) {
    throw new PublishError(
      "non-reproducible",
      "Non-reproducible reports cannot be published; commit changes and reanalyze",
    );
  }

  if (!report.policy.verified) {
    throw new PublishError(
      "unverified-policy",
      "Organization policy is unverifiable; publication is blocked",
    );
  }

  assertScopeMatchesReport(scope, report);

  const selectedFindings = resolveSelections(report, selections);
  const warnings = [...report.warnings];
  const published: PublicationResult["published"] = [];

  for (const finding of selectedFindings) {
    const reportHash = report.reportHash ?? expectedHash;
    const result = await dependencies.gateway.reconcileFinding(
      report.snapshot,
      finding,
      reportHash,
    );
    published.push(result);
  }

  return { published, warnings };
}

function assertScopeMatchesReport(
  scope: OperatingScope,
  report: AnalysisReport,
): void {
  const organization = scope.organization.toLowerCase();
  const owner = report.snapshot.owner.toLowerCase();
  if (organization !== "unknown" && organization !== owner) {
    throw new PublishError(
      "scope-mismatch",
      `Report owner ${report.snapshot.owner} is outside operating scope organization ${scope.organization}`,
    );
  }

  if (scope.repositories.length > 0) {
    const repo = report.snapshot.repo.toLowerCase();
    const allowed = scope.repositories.map((name) => name.toLowerCase());
    if (!allowed.includes(repo)) {
      throw new PublishError(
        "scope-mismatch",
        `Report repository ${report.snapshot.repo} is outside operating scope repositories`,
      );
    }
  }
}

function resolveSelections(
  report: AnalysisReport,
  selections: string[],
): Finding[] {
  const seen = new Set<string>();
  const findingsById = new Map(
    report.findings.map((finding) => [finding.selectionId, finding]),
  );
  const selected: Finding[] = [];

  for (const selectionId of selections) {
    if (seen.has(selectionId)) {
      throw new PublishError(
        "duplicate-selection",
        `Duplicate selection ID: ${selectionId}`,
      );
    }
    seen.add(selectionId);

    const finding = findingsById.get(selectionId);
    if (!finding) {
      throw new PublishError(
        "unknown-selection",
        `Unknown selection ID: ${selectionId}`,
      );
    }
    selected.push(finding);
  }

  return selected;
}
