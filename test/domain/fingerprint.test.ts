import { describe, expect, it } from "vitest";
import {
  detectionFingerprint,
  findingFingerprint,
} from "../../src/domain/fingerprint.js";

describe("findingFingerprint", () => {
  it("ignores ordering and case noise", () => {
    expect(
      findingFingerprint({
        owner: "acme",
        repo: "api",
        packageEcosystem: "npm",
        packageName: "lodash",
        vulnerabilityIds: ["CVE-2026-0002", "CVE-2026-0001"],
        fixedVersions: ["4.17.22"],
      }),
    ).toBe(
      findingFingerprint({
        owner: "ACME",
        repo: "api",
        packageEcosystem: "npm",
        packageName: "lodash",
        vulnerabilityIds: ["cve-2026-0001", "cve-2026-0002"],
        fixedVersions: ["4.17.22"],
      }),
    );
  });

  it("does not depend on detector identity", () => {
    const shared = {
      owner: "acme",
      repo: "api",
      packageEcosystem: "npm",
      packageName: "lodash",
      vulnerabilityIds: ["CVE-2026-0001"],
      fixedVersions: ["4.17.22"],
    };
    expect(findingFingerprint(shared)).toBe(findingFingerprint(shared));
  });

  it("does not collide across different remediation targets", () => {
    const left = findingFingerprint({
      owner: "acme",
      repo: "api",
      packageEcosystem: "npm",
      packageName: "lodash",
      vulnerabilityIds: ["CVE-2026-0001"],
      fixedVersions: ["4.17.22"],
    });
    const right = findingFingerprint({
      owner: "acme",
      repo: "api",
      packageEcosystem: "npm",
      packageName: "lodash",
      vulnerabilityIds: ["CVE-2026-0001"],
      fixedVersions: ["4.17.23"],
    });
    expect(left).not.toBe(right);
  });
});

describe("detectionFingerprint", () => {
  it("changes when detector identity changes", () => {
    const shared = {
      owner: "acme",
      repo: "api",
      packageEcosystem: "npm",
      packageName: "lodash",
      installedVersion: "4.17.21",
      vulnerabilityIds: ["CVE-2026-0001"],
      target: "package-lock.json",
    };
    expect(
      detectionFingerprint({ ...shared, detector: "trivy-vulnerability" }),
    ).not.toBe(
      detectionFingerprint({ ...shared, detector: "osv-vulnerability" }),
    );
  });
});
