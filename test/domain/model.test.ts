import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "../../src/domain/model.js";

describe("AnalysisReport", () => {
  it("preserves schema version and reproducible snapshot identity", () => {
    const report = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-31T00:00:00.000Z",
      reproducible: true,
      snapshot: {
        owner: "acme",
        repo: "api",
        commitSha: "a".repeat(40),
        dirty: false,
      },
      policy: { verified: true, sources: ["product-defaults"] },
      findings: [],
      warnings: [],
    } satisfies AnalysisReport;
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });
});
