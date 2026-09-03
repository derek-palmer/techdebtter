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

  it("covers every bot phase exhaustively", () => {
    const phases: BotPhase[] = ["discover", "analyze", "publish"];
    for (const phase of phases) {
      expect(permissionsForPhase(phase)).toBeTypeOf("object");
    }
  });
});
