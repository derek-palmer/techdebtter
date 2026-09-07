import { describe, expect, it } from "vitest";
import {
  permissionsForPhase,
  type BotPhase,
} from "../../src/adapters/github-app-auth.js";

describe("permissionsForPhase", () => {
  it("never grants write permissions during discover or analyze", () => {
    for (const phase of ["discover", "analyze"] as const) {
      const permissions = permissionsForPhase(phase);
      expect(Object.values(permissions).every((value) => value === "read")).toBe(
        true,
      );
      expect(permissions.issues).toBeUndefined();
    }
  });

  it("grants issues write only during publish", () => {
    const permissions = permissionsForPhase("publish");
    expect(permissions.issues).toBe("write");
    expect(permissions.contents).toBe("read");
  });

  it("grants contents and pull request write only during remediate", () => {
    const permissions = permissionsForPhase("remediate");
    expect(permissions.contents).toBe("write");
    expect(permissions.pull_requests).toBe("write");
    expect(permissions.checks).toBe("read");
    expect(permissions.issues).toBeUndefined();
  });

  it("covers every bot phase exhaustively", () => {
    const phases: BotPhase[] = ["discover", "analyze", "publish", "remediate"];
    for (const phase of phases) {
      expect(permissionsForPhase(phase)).toBeTypeOf("object");
    }
  });
});
