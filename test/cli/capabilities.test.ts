import { describe, expect, it } from "vitest";
import { EXIT_SUCCESS } from "../../src/cli/exit-codes.js";
import { runCli } from "../../src/cli/main.js";
import { captureIo } from "./helpers.js";

describe("runCli capabilities", () => {
  it("emits JSON capabilities on stdout with --json", async () => {
    const captured = captureIo();
    const exitCode = await runCli(["node", "techdebtter", "capabilities", "--json"], {
      dependencies: createAnalyzeDependencies(),
      io: captured.io,
    });

    expect(exitCode).toBe(EXIT_SUCCESS);
    const payload = JSON.parse(captured.stdout) as {
      cliVersion: string;
      reportSchemaVersions: string[];
      commands: string[];
      detectors: string[];
      publicationSupported: boolean;
    };

    expect(payload.cliVersion).toBe("0.1.0");
    expect(payload.reportSchemaVersions).toEqual(["1.0.0"]);
    expect(payload.commands).toEqual(["analyze", "capabilities", "publish"]);
    expect(payload.detectors).toEqual(["trivy-vulnerability"]);
    expect(payload.publicationSupported).toBe(true);
  });
});

function createAnalyzeDependencies() {
  return {
    repositorySource: {
      async snapshot() {
        return {
          owner: "acme",
          repo: "api",
          commitSha: "a".repeat(40),
          dirty: false,
        };
      },
    },
    detectors: [],
    enrichmentProviders: [],
    readOrganizationPolicy: async () => ({ state: "absent" as const }),
    readRepositoryPolicy: async () => ({ state: "absent" as const }),
    clock: { now: () => new Date("2026-08-31T12:00:00.000Z") },
  };
}
