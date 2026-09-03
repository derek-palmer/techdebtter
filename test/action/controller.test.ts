import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("bot controller action and template", () => {
  it("declares a node24 action with phase-scoped inputs", () => {
    const action = parseYaml(readFileSync(join(root, "action.yml"), "utf8")) as {
      runs: { using: string; main: string };
      inputs: Record<string, { required?: boolean }>;
    };

    expect(action.runs.using).toBe("node24");
    expect(action.runs.main).toBe("dist/action/main.js");
    expect(action.inputs.phase?.required).toBe(true);
    expect(action.inputs.organization?.required).toBe(true);
    expect(action.inputs["app-id"]).toBeDefined();
    expect(action.inputs["private-key"]).toBeDefined();
  });

  it("keeps discover, analyze, and publish as separate jobs", () => {
    const workflow = parseYaml(
      readFileSync(join(root, "templates/controller-workflow.yml"), "utf8"),
    ) as {
      on: { schedule: unknown; workflow_dispatch: unknown };
      jobs: Record<string, { steps?: Array<{ uses?: string; with?: Record<string, string> }> }>;
    };

    expect(workflow.on.schedule).toBeDefined();
    expect(workflow.on.workflow_dispatch).toBeDefined();
    expect(Object.keys(workflow.jobs)).toEqual([
      "discover",
      "analyze",
      "publish",
    ]);

    const phases = Object.values(workflow.jobs)
      .flatMap((job) => job.steps ?? [])
      .map((step) => step.with?.phase)
      .filter(Boolean);
    expect(phases).toEqual(["discover", "analyze", "publish"]);

    const pinnedUses = Object.values(workflow.jobs)
      .flatMap((job) => job.steps ?? [])
      .map((step) => step.uses)
      .filter((value): value is string => Boolean(value));
    expect(
      pinnedUses.every(
        (value) =>
          value.includes("@") &&
          (value.includes("REPLACE_WITH_FULL_COMMIT_SHA") ||
            /@[0-9a-f]{40}/i.test(value) ||
            value.includes(" # ")),
      ),
    ).toBe(true);
  });
});
