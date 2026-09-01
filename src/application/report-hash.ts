import { createHash } from "node:crypto";
import type { AnalysisReport } from "../domain/model.js";

export function computeReportHash(
  report: Omit<AnalysisReport, "reportHash">,
): string {
  return createHash("sha256")
    .update(JSON.stringify(report), "utf8")
    .digest("hex");
}

export function withReportHash(
  report: Omit<AnalysisReport, "reportHash">,
): AnalysisReport {
  return {
    ...report,
    reportHash: computeReportHash(report),
  };
}
