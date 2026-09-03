import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { RemediationError } from "../application/remediation-error.js";
import type { Finding, RepositorySnapshot } from "../domain/model.js";
import type { RemediationPlan, Remediator } from "../domain/remediation.js";
import {
  createStaticRemediationPlan,
  isAgentReadyVulnerability,
} from "./remediator-helpers.js";

/**
 * Static remediator for Dockerfile base images (`FROM image:tag`).
 */
export class DockerBaseImageRemediator implements Remediator {
  readonly id = "docker-base-image";

  supports(finding: Finding): boolean {
    return (
      isAgentReadyVulnerability(finding, ["docker", "oci"]) &&
      (finding.target === "Dockerfile" ||
        finding.target?.endsWith("/Dockerfile") === true ||
        finding.target === undefined)
    );
  }

  async plan(
    finding: Finding,
    root: string,
    _snapshot: RepositorySnapshot,
  ): Promise<RemediationPlan> {
    if (!this.supports(finding)) {
      throw new RemediationError(
        "unsupported-finding",
        `Finding ${finding.selectionId} is not supported by ${this.id}`,
      );
    }

    const image = finding.packageName!;
    const targetTag = finding.fixedVersions![0]!;
    const path = finding.target ?? "Dockerfile";
    const absolute = join(root, path);
    const previous = await readFile(absolute, "utf8");
    const pattern = new RegExp(
      `^(FROM\\s+(?:--platform=\\S+\\s+)?${escapeRegex(image)}:)([^\\s]+)`,
      "im",
    );
    if (!pattern.test(previous)) {
      throw new RemediationError(
        "not-direct-dependency",
        `${image} base image was not found in ${path}`,
      );
    }

    const next = previous.replace(pattern, `$1${targetTag}`);
    return createStaticRemediationPlan({
      finding,
      remediatorId: this.id,
      summary: `Upgrade Docker base image ${image} to ${targetTag}`,
      mutations: [{ path, previousContent: previous, nextContent: next }],
      commands: ["docker build ."],
      notes: ["Only matching FROM image:tag lines are mutated."],
      rollbackSummary: `Restore ${image} to ${finding.installedVersion ?? "previous tag"}`,
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
