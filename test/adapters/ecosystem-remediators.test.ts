import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DockerBaseImageRemediator } from "../../src/adapters/docker-remediator.js";
import { PythonRequirementsRemediator } from "../../src/adapters/python-remediator.js";
import { RubyGemfileRemediator } from "../../src/adapters/ruby-remediator.js";
import { TerraformProviderRemediator } from "../../src/adapters/terraform-remediator.js";
import { createDefaultRemediators } from "../../src/adapters/remediators.js";
import type { Finding } from "../../src/domain/model.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("ecosystem remediators", () => {
  it("registers one remediator per supported ecosystem", () => {
    const ids = createDefaultRemediators().map((remediator) => remediator.id);
    expect(ids).toEqual([
      "npm-package-lock",
      "python-requirements",
      "docker-base-image",
      "ruby-gemfile",
      "terraform-provider",
    ]);
  });

  it("upgrades pinned Python requirements", async () => {
    const root = await tempRoot({
      "requirements.txt": "requests==2.31.0\n",
    });
    const plan = await new PythonRequirementsRemediator().plan(
      finding({
        packageEcosystem: "pip",
        packageName: "requests",
        installedVersion: "2.31.0",
        fixedVersions: ["2.32.0"],
        target: "requirements.txt",
      }),
      root,
      snapshot(),
    );
    expect(plan.mutations[0]?.nextContent).toContain("requests==2.32.0");
  });

  it("upgrades Dockerfile base image tags", async () => {
    const root = await tempRoot({
      Dockerfile: "FROM node:18-alpine\n",
    });
    const plan = await new DockerBaseImageRemediator().plan(
      finding({
        packageEcosystem: "docker",
        packageName: "node",
        installedVersion: "18-alpine",
        fixedVersions: ["20-alpine"],
        target: "Dockerfile",
      }),
      root,
      snapshot(),
    );
    expect(plan.mutations[0]?.nextContent).toContain("FROM node:20-alpine");
  });

  it("upgrades Ruby Gemfile pins", async () => {
    const root = await tempRoot({
      Gemfile: 'gem "rack", "2.2.0"\n',
    });
    const plan = await new RubyGemfileRemediator().plan(
      finding({
        packageEcosystem: "rubygems",
        packageName: "rack",
        installedVersion: "2.2.0",
        fixedVersions: ["2.2.14"],
        target: "Gemfile",
      }),
      root,
      snapshot(),
    );
    expect(plan.mutations[0]?.nextContent).toContain('gem "rack", "2.2.14"');
  });

  it("upgrades Terraform provider versions", async () => {
    const root = await tempRoot({
      "versions.tf": `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.0.0"
    }
  }
}
`,
    });
    const plan = await new TerraformProviderRemediator().plan(
      finding({
        packageEcosystem: "terraform",
        packageName: "aws",
        installedVersion: "5.0.0",
        fixedVersions: ["5.60.0"],
        target: "versions.tf",
      }),
      root,
      snapshot(),
    );
    expect(plan.mutations[0]?.nextContent).toContain('version = "5.60.0"');
  });
});

async function tempRoot(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "techdebtter-eco-"));
  tempDirs.push(root);
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(root, name), contents, "utf8");
  }
  return root;
}

function snapshot() {
  return {
    owner: "acme",
    repo: "api",
    commitSha: "a".repeat(40),
    dirty: false,
  };
}

function finding(
  overrides: Partial<Finding> &
    Pick<
      Finding,
      "packageEcosystem" | "packageName" | "installedVersion" | "fixedVersions" | "target"
    >,
): Finding {
  return {
    selectionId: "abc123def456",
    fingerprint: "f".repeat(64),
    detectionFingerprints: ["det-1"],
    class: "vulnerability",
    title: "finding",
    calculatedCriticality: "high",
    effectiveCriticality: "high",
    criticalityReasons: ["fixture"],
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
    ...overrides,
  };
}
