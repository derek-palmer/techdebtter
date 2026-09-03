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
 * Static remediator for Terraform required_providers version constraints.
 */
export class TerraformProviderRemediator implements Remediator {
  readonly id = "terraform-provider";

  supports(finding: Finding): boolean {
    return (
      isAgentReadyVulnerability(finding, ["terraform", "tf"]) &&
      (finding.target?.endsWith(".tf") === true ||
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

    const provider = finding.packageName!;
    const targetVersion = finding.fixedVersions![0]!;
    const path = finding.target ?? "versions.tf";
    const previous = await readFile(join(root, path), "utf8");
    const pattern = new RegExp(
      `(${escapeRegex(provider)}\\s*=\\s*\\{[\\s\\S]*?version\\s*=\\s*")([^"]+)(")`,
      "m",
    );
    if (!pattern.test(previous)) {
      throw new RemediationError(
        "not-direct-dependency",
        `${provider} provider version was not found in ${path}`,
      );
    }

    const next = previous.replace(pattern, `$1${targetVersion}$3`);
    return createStaticRemediationPlan({
      finding,
      remediatorId: this.id,
      summary: `Upgrade Terraform provider ${provider} to ${targetVersion}`,
      mutations: [{ path, previousContent: previous, nextContent: next }],
      commands: ["terraform init -upgrade", "terraform validate"],
      notes: ["Only required_providers version attributes are mutated."],
      rollbackSummary: `Restore ${provider} to ${finding.installedVersion ?? "previous version"}`,
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
