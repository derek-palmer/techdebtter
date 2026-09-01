import { createHash } from "node:crypto";
import type { Detection, Evidence, RepositorySnapshot } from "../domain/model.js";
import type { Detector } from "../domain/ports.js";
import { detectionFingerprint } from "../domain/fingerprint.js";
import { PrerequisiteError } from "./errors.js";
import type { ProcessRunner } from "./process.js";
import { execProcessRunner } from "./process.js";

const MIN_VERSION = [0, 60, 0] as const;
const MAX_VERSION = [1, 0, 0] as const;

interface TrivyVulnerability {
  VulnerabilityID?: string;
  PkgName?: string;
  InstalledVersion?: string;
  FixedVersion?: string;
  Severity?: string;
}

interface TrivyResult {
  Target?: string;
  Vulnerabilities?: TrivyVulnerability[] | null;
}

interface TrivyReport {
  Results?: TrivyResult[] | null;
}

export class TrivyVulnerabilityDetector implements Detector {
  readonly id = "trivy-vulnerability";

  constructor(private readonly runner: ProcessRunner = execProcessRunner) {}

  async detect(
    snapshot: RepositorySnapshot,
    root: string,
  ): Promise<Detection[]> {
    const version = await this.readSupportedVersion(root);
    const scan = await this.runner.run(
      "trivy",
      ["fs", "--format", "json", "--scanners", "vuln", "--quiet", root],
      { cwd: root },
    );

    if (scan.exitCode !== 0) {
      throw new PrerequisiteError(
        "trivy-scan-failed",
        redactSecrets(scan.stderr.trim() || "Trivy scan failed"),
      );
    }

    let report: TrivyReport;
    try {
      report = JSON.parse(scan.stdout) as TrivyReport;
    } catch {
      throw new PrerequisiteError(
        "trivy-scan-failed",
        "Trivy returned invalid JSON",
      );
    }

    const observedAt = new Date().toISOString();
    const rawHash = createHash("sha256")
      .update(scan.stdout, "utf8")
      .digest("hex");

    const detections: Detection[] = [];
    for (const result of report.Results ?? []) {
      const target = result.Target ?? root;
      for (const vulnerability of result.Vulnerabilities ?? []) {
        const detection = toDetection(
          vulnerability,
          target,
          version,
          observedAt,
          rawHash,
          snapshot,
        );
        if (detection) {
          detections.push(detection);
        }
      }
    }

    return detections;
  }

  private async readSupportedVersion(root: string): Promise<string> {
    const versionRun = await this.runner.run("trivy", ["--version"], {
      cwd: root,
    });
    if (versionRun.exitCode !== 0) {
      throw new PrerequisiteError(
        "trivy-missing",
        "Trivy is not installed or not available on PATH",
      );
    }

    const match = /Version:\s*([0-9]+(?:\.[0-9]+)*)/i.exec(versionRun.stdout);
    const version = match?.[1];
    if (!version || !isSupportedVersion(version)) {
      throw new PrerequisiteError(
        "trivy-unsupported-version",
        `Trivy version ${version ?? "unknown"} is outside supported range >=0.60.0 <1.0.0`,
      );
    }

    return version;
  }
}

function toDetection(
  vulnerability: TrivyVulnerability,
  target: string,
  detectorVersion: string,
  observedAt: string,
  rawHash: string,
  snapshot: RepositorySnapshot,
): Detection | undefined {
  const packageName = vulnerability.PkgName?.trim();
  const vulnerabilityId = vulnerability.VulnerabilityID?.trim();
  if (!packageName || !vulnerabilityId) {
    return undefined;
  }

  const installedVersion = vulnerability.InstalledVersion?.trim() ?? "unknown";
  const fixedVersion = vulnerability.FixedVersion?.trim();
  const fixedVersions = fixedVersion ? [fixedVersion] : [];
  const severity = mapSeverity(vulnerability.Severity);

  const evidence: Evidence[] = [
    {
      kind: "detector",
      source: "trivy-vulnerability",
      observedAt,
      subject: "raw-result",
      value: rawHash,
    },
    {
      kind: "severity",
      source: "trivy-vulnerability",
      observedAt,
      subject: vulnerabilityId,
      value: severity,
    },
    {
      kind: "repository",
      source: "trivy-vulnerability",
      observedAt,
      subject: "target",
      value: target,
    },
  ];

  const fingerprint = detectionFingerprint({
    detector: "trivy-vulnerability",
    owner: snapshot.owner,
    repo: snapshot.repo,
    packageEcosystem: "unknown",
    packageName,
    installedVersion,
    vulnerabilityIds: [vulnerabilityId],
    target,
  });

  return {
    fingerprint,
    detector: "trivy-vulnerability",
    detectorVersion,
    class: "vulnerability",
    packageEcosystem: "unknown",
    packageName,
    installedVersion,
    fixedVersions,
    vulnerabilityIds: [vulnerabilityId],
    target,
    severity,
    evidence,
  };
}

function mapSeverity(value: string | undefined): Detection["severity"] {
  switch ((value ?? "unknown").trim().toUpperCase()) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "LOW":
      return "low";
    case "NEGLIGIBLE":
      return "negligible";
    default:
      return "unknown";
  }
}

export function isSupportedVersion(version: string): boolean {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  return (
    compareVersion(parts, [...MIN_VERSION]) >= 0 &&
    compareVersion(parts, [...MAX_VERSION]) < 0
  );
}

function compareVersion(left: number[], right: readonly number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }
  return 0;
}

function redactSecrets(text: string): string {
  return text.replace(/(token|password|secret)=\S+/gi, "$1=[REDACTED]");
}
