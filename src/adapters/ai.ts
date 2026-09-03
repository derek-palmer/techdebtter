import { createHash } from "node:crypto";
import type { Evidence, Finding } from "../domain/model.js";

export interface AiPolicyGate {
  enabled: boolean;
  allowedPurposes: string[];
}

export interface AiTaskRequest {
  purpose: string;
  provider: string;
  model: string;
  finding: Finding;
  evidence: Evidence[];
}

export interface AiTaskPayload {
  purpose: string;
  provider: string;
  model: string;
  selectionId: string;
  findingFingerprint: string;
  /** Redacted, minimum evidence for the named purpose. */
  evidence: Array<{
    kind: Evidence["kind"];
    source: string;
    subject: string;
    valueHash: string;
  }>;
  provenance: {
    evidenceHashes: string[];
    findingFingerprint: string;
  };
}

export interface AiPlanner {
  readonly id: string;
  plan(payload: AiTaskPayload): Promise<{ summary: string; steps: string[] }>;
}

export class AiPolicyError extends Error {
  readonly code = "ai-not-permitted";

  constructor(message: string) {
    super(message);
    this.name = "AiPolicyError";
  }
}

/**
 * Build a redacted AI payload. Never includes raw repository source, secrets,
 * credentials, or full detector blobs — only hashed Evidence values.
 */
export function buildAiTaskPayload(
  request: AiTaskRequest,
  policy: AiPolicyGate,
): AiTaskPayload {
  assertAiAllowed(request.purpose, policy);

  const evidence = request.evidence.slice(0, 8).map((item) => ({
    kind: item.kind,
    source: item.source,
    subject: item.subject,
    valueHash: hashValue(item.value),
  }));

  return {
    purpose: request.purpose,
    provider: request.provider,
    model: request.model,
    selectionId: request.finding.selectionId,
    findingFingerprint: request.finding.fingerprint,
    evidence,
    provenance: {
      evidenceHashes: evidence.map((item) => item.valueHash),
      findingFingerprint: request.finding.fingerprint,
    },
  };
}

export function assertAiAllowed(purpose: string, policy: AiPolicyGate): void {
  if (!policy.enabled) {
    throw new AiPolicyError(
      "AI adapters are disabled; enable them explicitly in Organization or Repository Policy",
    );
  }
  if (!policy.allowedPurposes.includes(purpose)) {
    throw new AiPolicyError(
      `AI purpose "${purpose}" is not permitted by policy`,
    );
  }
}

function hashValue(value: string | number | boolean): string {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}
