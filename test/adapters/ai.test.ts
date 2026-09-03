import { describe, expect, it } from "vitest";
import {
  AiPolicyError,
  assertAiAllowed,
  buildAiTaskPayload,
} from "../../src/adapters/ai.js";
import type { Finding } from "../../src/domain/model.js";

const finding: Finding = {
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
      value: "super-secret-raw-detector-blob",
    },
  ],
};

describe("AI adapter privacy contract", () => {
  it("blocks AI use when policy is not opted in", () => {
    expect(() =>
      assertAiAllowed("remediation-planning", {
        enabled: false,
        allowedPurposes: ["remediation-planning"],
      }),
    ).toThrow(AiPolicyError);
  });

  it("blocks purposes outside the allow-list", () => {
    expect(() =>
      assertAiAllowed("exfiltrate", {
        enabled: true,
        allowedPurposes: ["remediation-planning"],
      }),
    ).toThrow(/not permitted/i);
  });

  it("hashes evidence values and never includes raw detector blobs", () => {
    const payload = buildAiTaskPayload(
      {
        purpose: "remediation-planning",
        provider: "example",
        model: "example-1",
        finding,
        evidence: finding.evidence,
      },
      {
        enabled: true,
        allowedPurposes: ["remediation-planning"],
      },
    );

    expect(payload.purpose).toBe("remediation-planning");
    expect(payload.provider).toBe("example");
    expect(payload.model).toBe("example-1");
    expect(JSON.stringify(payload)).not.toContain("super-secret-raw-detector-blob");
    expect(payload.evidence[0]?.valueHash).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.provenance.evidenceHashes).toHaveLength(1);
  });
});
