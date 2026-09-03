import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { NpmPackageLockRemediator } from "../../src/adapters/npm-remediator.js";
import type { Finding } from "../../src/domain/model.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/npm",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("NpmPackageLockRemediator", () => {
  it("plans a static upgrade for a direct npm dependency", async () => {
    const root = await copyFixture();
    const remediator = new NpmPackageLockRemediator();
    const finding = baseFinding();

    expect(remediator.supports(finding)).toBe(true);
    const plan = await remediator.plan(
      finding,
      root,
      {
        owner: "acme",
        repo: "api",
        commitSha: "a".repeat(40),
        dirty: false,
      },
    );

    expect(plan.summary).toContain("lodash");
    expect(plan.mutations).toHaveLength(2);
    expect(plan.validation.kind).toBe("static");

    const nextPackageJson = JSON.parse(plan.mutations[0]!.nextContent) as {
      dependencies: Record<string, string>;
    };
    const nextLock = JSON.parse(plan.mutations[1]!.nextContent) as {
      packages: Record<string, { version?: string; resolved?: string }>;
    };

    expect(nextPackageJson.dependencies.lodash).toBe("4.17.22");
    expect(nextLock.packages["node_modules/lodash"]?.version).toBe("4.17.22");
    expect(nextLock.packages["node_modules/lodash"]?.resolved).toBeUndefined();
  });

  it("rejects transitive-only packages", async () => {
    const root = await copyFixture();
    const remediator = new NpmPackageLockRemediator();
    await expect(
      remediator.plan(
        {
          ...baseFinding(),
          packageName: "left-pad",
        },
        root,
        {
          owner: "acme",
          repo: "api",
          commitSha: "a".repeat(40),
          dirty: false,
        },
      ),
    ).rejects.toMatchObject({ code: "not-direct-dependency" });
  });
});

async function copyFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "techdebtter-npm-"));
  tempDirs.push(root);
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "package.json"),
    await readFile(join(fixtureDir, "package.json"), "utf8"),
  );
  await writeFile(
    join(root, "package-lock.json"),
    await readFile(join(fixtureDir, "package-lock.json"), "utf8"),
  );
  return root;
}

function baseFinding(): Finding {
  return {
    selectionId: "abc123def456",
    fingerprint: "f".repeat(64),
    detectionFingerprints: ["det-1"],
    class: "vulnerability",
    title: "lodash@4.17.21: CVE-2026-0001",
    calculatedCriticality: "critical",
    effectiveCriticality: "critical",
    criticalityReasons: ["CISA KEV"],
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
    packageEcosystem: "npm",
    packageName: "lodash",
    installedVersion: "4.17.21",
    fixedVersions: ["4.17.22"],
    target: "package-lock.json",
  };
}
