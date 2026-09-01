import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PrerequisiteError } from "../../src/adapters/errors.js";
import type { ProcessRunner } from "../../src/adapters/process.js";
import {
  isSupportedVersion,
  TrivyVulnerabilityDetector,
} from "../../src/adapters/trivy.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/trivy/vulnerability.json",
);
const fixtureOutput = readFileSync(fixturePath, "utf8");

describe("isSupportedVersion", () => {
  it("accepts supported versions and rejects unsupported ones", () => {
    expect(isSupportedVersion("0.60.0")).toBe(true);
    expect(isSupportedVersion("0.59.9")).toBe(false);
    expect(isSupportedVersion("1.0.0")).toBe(false);
  });
});

describe("TrivyVulnerabilityDetector", () => {
  it("runs version then fs scan and maps fixture vulnerabilities to detections", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const runner: ProcessRunner = {
      async run(command, args) {
        calls.push({ command, args });
        if (command === "trivy" && args[0] === "--version") {
          return { stdout: "Version: 0.60.0\n", stderr: "", exitCode: 0 };
        }
        if (command === "trivy" && args[0] === "fs") {
          return { stdout: fixtureOutput, stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "unexpected command", exitCode: 1 };
      },
    };

    const detector = new TrivyVulnerabilityDetector(runner);
    const detections = await detector.detect(
      {
        owner: "acme",
        repo: "api",
        commitSha: "a".repeat(40),
        dirty: false,
      },
      "/tmp/repo",
    );

    expect(calls).toEqual([
      { command: "trivy", args: ["--version"] },
      {
        command: "trivy",
        args: [
          "fs",
          "--format",
          "json",
          "--scanners",
          "vuln",
          "--quiet",
          "/tmp/repo",
        ],
      },
    ]);
    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      detector: "trivy-vulnerability",
      detectorVersion: "0.60.0",
      class: "vulnerability",
      packageName: "lodash",
      installedVersion: "4.17.21",
      fixedVersions: ["4.17.22"],
      vulnerabilityIds: ["CVE-2026-0001"],
      target: "package-lock.json",
      severity: "high",
    });
    expect(detections[0]?.evidence.some((item) => item.subject === "raw-result")).toBe(
      true,
    );
  });

  it("preserves redacted stderr on scan failure", async () => {
    const runner: ProcessRunner = {
      async run(command, args) {
        if (command === "trivy" && args[0] === "--version") {
          return { stdout: "Version: 0.60.0\n", stderr: "", exitCode: 0 };
        }
        return {
          stdout: "",
          stderr: "token=super-secret-value scan failed",
          exitCode: 1,
        };
      },
    };

    const detector = new TrivyVulnerabilityDetector(runner);
    await expect(
      detector.detect(
        {
          owner: "acme",
          repo: "api",
          commitSha: "a".repeat(40),
          dirty: false,
        },
        "/tmp/repo",
      ),
    ).rejects.toMatchObject({
      code: "trivy-scan-failed",
      message: expect.stringContaining("[REDACTED]"),
    } satisfies Partial<PrerequisiteError>);
  });
});
