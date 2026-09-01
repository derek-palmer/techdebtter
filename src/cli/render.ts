import type { AnalysisReport, Criticality, Finding } from "../domain/model.js";

export function renderTerminal(report: AnalysisReport): string {
  const lines: string[] = [
    `TechDebtter Analysis Report (${report.schemaVersion})`,
    `Repository: ${report.snapshot.owner}/${report.snapshot.repo}@${report.snapshot.commitSha.slice(0, 7)}`,
    `Reproducible: ${report.reproducible ? "yes" : "no"}`,
    `Findings: ${report.findings.length}`,
    "",
  ];

  if (report.warnings.length > 0) {
    lines.push("Warnings:");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  if (report.findings.length === 0) {
    lines.push("No findings.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("Findings:");
  for (const finding of report.findings) {
    lines.push(renderFindingLine(finding));
  }

  return `${lines.join("\n")}\n`;
}

export function renderMarkdown(report: AnalysisReport): string {
  const lines: string[] = [
    "# TechDebtter Analysis Report",
    "",
    `- Schema: ${report.schemaVersion}`,
    `- Repository: \`${report.snapshot.owner}/${report.snapshot.repo}\``,
    `- Commit: \`${report.snapshot.commitSha}\``,
    `- Reproducible: ${report.reproducible ? "yes" : "no"}`,
    "",
  ];

  if (report.warnings.length > 0) {
    lines.push("## Warnings", "");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Findings", "");
  if (report.findings.length === 0) {
    lines.push("_No findings._");
  } else {
    for (const finding of report.findings) {
      lines.push(
        `- \`${finding.selectionId}\` **${finding.title}** (${finding.effectiveCriticality}, ${finding.route})`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderFindingLine(finding: Finding): string {
  return `[${finding.selectionId}] ${finding.title} (${finding.effectiveCriticality}, ${finding.route})`;
}

export function exceedsFailOnThreshold(
  findings: Finding[],
  threshold: Criticality,
): boolean {
  const rank: Record<Criticality, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const minimumRank = rank[threshold];
  return findings.some(
    (finding) => rank[finding.effectiveCriticality] <= minimumRank,
  );
}
