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
 * Static remediator for Gemfile pins (`gem "name", "version"`).
 */
export class RubyGemfileRemediator implements Remediator {
  readonly id = "ruby-gemfile";

  supports(finding: Finding): boolean {
    return (
      isAgentReadyVulnerability(finding, ["rubygems", "ruby"]) &&
      (finding.target === "Gemfile" || finding.target === undefined)
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

    const gemName = finding.packageName!;
    const targetVersion = finding.fixedVersions![0]!;
    const path = "Gemfile";
    const previous = await readFile(join(root, path), "utf8");
    const pattern = new RegExp(
      `(gem\\s+["']${escapeRegex(gemName)}["']\\s*,\\s*["'])([^"']+)(["'])`,
      "i",
    );
    if (!pattern.test(previous)) {
      throw new RemediationError(
        "not-direct-dependency",
        `${gemName} is not a pinned gem in Gemfile`,
      );
    }

    const next = previous.replace(pattern, `$1${targetVersion}$3`);
    return createStaticRemediationPlan({
      finding,
      remediatorId: this.id,
      summary: `Upgrade Ruby gem ${gemName} to ${targetVersion}`,
      mutations: [{ path, previousContent: previous, nextContent: next }],
      commands: ["bundle install"],
      notes: [
        "Only Gemfile version pins are mutated; Gemfile.lock updates are deferred to CI.",
      ],
      rollbackSummary: `Restore ${gemName} to ${finding.installedVersion ?? "previous version"}`,
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
