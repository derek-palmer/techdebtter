import type { Finding } from "../domain/model.js";
import type { FileMutation, RemediationPlan } from "../domain/remediation.js";

export function createStaticRemediationPlan(input: {
  finding: Finding;
  remediatorId: string;
  summary: string;
  mutations: FileMutation[];
  commands: string[];
  notes: string[];
  rollbackSummary: string;
}): RemediationPlan {
  return {
    findingFingerprint: input.finding.fingerprint,
    selectionId: input.finding.selectionId,
    summary: input.summary,
    mutations: input.mutations,
    validation: {
      kind: "static",
      commands: input.commands,
      notes: [
        ...input.notes,
        `Remediator: ${input.remediatorId}`,
        "Bot mode never executes target-repository lifecycle scripts.",
      ],
    },
    rollback: {
      summary: input.rollbackSummary,
      mutations: input.mutations.map((mutation) => ({
        path: mutation.path,
        previousContent: mutation.nextContent,
        nextContent: mutation.previousContent,
      })),
    },
  };
}

export function isAgentReadyVulnerability(
  finding: Finding,
  ecosystems: string[],
): boolean {
  return (
    finding.class === "vulnerability" &&
    finding.route === "ready-for-agent" &&
    Boolean(finding.packageName) &&
    Boolean(finding.fixedVersions?.[0]) &&
    ecosystems.includes(finding.packageEcosystem ?? "")
  );
}
