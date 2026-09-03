import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const skillPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../skills/techdebtter/SKILL.md",
);

describe("skills/techdebtter/SKILL.md", () => {
  const { frontmatter, body } = loadSkill(skillPath);

  it("uses the techdebtter name and user-only invocation", () => {
    expect(frontmatter.name).toBe("techdebtter");
    expect(frontmatter["disable-model-invocation"]).toBe(true);
    expect(frontmatter.description).toMatch(/publish selected/i);
  });

  it("negotiates CLI compatibility through capabilities --json", () => {
    expect(body).toContain("techdebtter capabilities --json");
    expect(body).toContain("publicationSupported");
    expect(body).toContain("reportSchemaVersions");
  });

  it("prefers project-pinned CLI and asks before install or upgrade", () => {
    expect(body).toContain("./node_modules/.bin/techdebtter");
    expect(body).toMatch(/ask the user before/i);
    expect(body).toMatch(/never install silently/i);
  });

  it("verifies gh and Trivy prerequisites before analysis", () => {
    expect(body).toContain("gh auth status");
    expect(body).toMatch(/trivy/i);
    expect(body).toMatch(/analyze/i);
  });

  it("requires analysis before selection and confirmation before publication", () => {
    expect(body.indexOf("Analyze the repository")).toBeLessThan(
      body.indexOf("Collect explicit selections"),
    );
    expect(body).toContain("selectionId");
    expect(body).toMatch(/confirm/i);
    expect(body).toContain("techdebtter publish");
    expect(body).toMatch(/never publish all findings by default/i);
  });

  it("offers to-issues without auto-installing it", () => {
    expect(body).toMatch(/to-issues/i);
    expect(body).toMatch(/never install `to-issues` silently/i);
    expect(body).toMatch(/ask before suggesting installation/i);
  });

  it("does not duplicate policy defaults or report schema definitions", () => {
    const forbidden = [
      "productDefaults",
      "policy.schema.json",
      "analysis-report.schema.json",
      "additionalProperties",
      '"detectors"',
      "maxOpenPullRequests",
      "epssRaiseThreshold",
    ];
    for (const snippet of forbidden) {
      expect(body).not.toContain(snippet);
    }
  });

  it("documents skills.sh installation commands", () => {
    expect(body).toContain(
      "npx skills add derek-palmer/techdebtter --skill techdebtter",
    );
    expect(body).toContain("-g");
    expect(body).toContain("--agent");
  });
});

function loadSkill(path: string): { frontmatter: Record<string, unknown>; body: string } {
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Missing YAML frontmatter in ${path}`);
  }
  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  return { frontmatter, body: match[2] };
}
