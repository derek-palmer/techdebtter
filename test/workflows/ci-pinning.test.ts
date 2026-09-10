import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// NFR2.6: every external Action reference in .github/workflows/ci.yml must
// be pinned to a full 40-character commit SHA, not a tag or branch.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const FULL_SHA = /^[^@]+@[0-9a-f]{40}(\s|$)/;

interface WorkflowFile {
  jobs: Record<
    string,
    {
      steps?: Array<{ uses?: string }>;
    }
  >;
}

describe("ci.yml external Action pinning (NFR2.6)", () => {
  it("pins every 'uses:' reference to a full commit SHA", () => {
    const raw = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const workflow = parseYaml(raw) as WorkflowFile;

    const usesLines = Object.values(workflow.jobs)
      .flatMap((job) => job.steps ?? [])
      .map((step) => step.uses)
      .filter((uses): uses is string => Boolean(uses));

    expect(usesLines.length).toBeGreaterThan(0);

    for (const uses of usesLines) {
      const atIndex = uses.lastIndexOf("@");
      expect(atIndex, `${uses} is missing an @ pin`).toBeGreaterThan(-1);
      const ref = uses.slice(atIndex + 1);
      expect(
        /^[0-9a-f]{40}$/.test(ref),
        `${uses} must be pinned to a full 40-character commit SHA, not "${ref}"`,
      ).toBe(true);
    }
  });

  it("keeps the raw file's inline comment style consistent with a SHA + version-comment pin", () => {
    const raw = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const usesLines = raw
      .split("\n")
      .filter((line) => line.trim().startsWith("- uses:"));

    expect(usesLines.length).toBeGreaterThan(0);
    for (const line of usesLines) {
      expect(FULL_SHA.test(line.replace("- uses:", "").trim())).toBe(true);
    }
  });
});
