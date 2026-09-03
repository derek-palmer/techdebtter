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
 * Static remediator for pinned packages in requirements.txt.
 * Supports `name==version` lines only (direct pins).
 */
export class PythonRequirementsRemediator implements Remediator {
  readonly id = "python-requirements";

  supports(finding: Finding): boolean {
    return (
      isAgentReadyVulnerability(finding, ["pip", "python", "python-pkg"]) &&
      (finding.target === "requirements.txt" || finding.target === undefined)
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

    const packageName = finding.packageName!;
    const targetVersion = finding.fixedVersions![0]!;
    const path = finding.target === "requirements.txt"
      ? "requirements.txt"
      : "requirements.txt";
    const absolute = join(root, path);
    const previous = await readFile(absolute, "utf8");
    const pattern = new RegExp(
      `^(${escapeRegex(packageName)}\\s*==\\s*)([^\\s#]+)`,
      "im",
    );
    if (!pattern.test(previous)) {
      throw new RemediationError(
        "not-direct-dependency",
        `${packageName} is not a pinned == dependency in ${path}`,
      );
    }

    const next = previous.replace(pattern, `$1${targetVersion}`);
    return createStaticRemediationPlan({
      finding,
      remediatorId: this.id,
      summary: `Upgrade Python package ${packageName} to ${targetVersion}`,
      mutations: [
        {
          path,
          previousContent: previous,
          nextContent: next,
        },
      ],
      commands: ["python -m pip install -r requirements.txt"],
      notes: ["Only pinned name==version requirements lines are mutated."],
      rollbackSummary: `Restore ${packageName} to ${finding.installedVersion ?? "previous pin"}`,
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
