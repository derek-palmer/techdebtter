import type { ProcessRunner } from "./process.js";

export class GhAuthError extends Error {
  readonly code: "gh-not-authenticated" | "gh-token-unavailable";

  constructor(code: GhAuthError["code"], message: string) {
    super(message);
    this.name = "GhAuthError";
    this.code = code;
  }
}

export async function activeGhToken(
  runner: ProcessRunner,
): Promise<string> {
  const status = await runner.run("gh", ["auth", "status"]);
  if (status.exitCode !== 0) {
    throw new GhAuthError(
      "gh-not-authenticated",
      "GitHub CLI is not authenticated; run `gh auth login`",
    );
  }

  const tokenResult = await runner.run("gh", ["auth", "token"]);
  if (tokenResult.exitCode !== 0) {
    throw new GhAuthError(
      "gh-token-unavailable",
      "Unable to obtain GitHub CLI token",
    );
  }

  const token = tokenResult.stdout.trim();
  if (token.length === 0) {
    throw new GhAuthError(
      "gh-token-unavailable",
      "GitHub CLI returned an empty token",
    );
  }

  return token;
}

export function redactToken(value: string, token: string): string {
  if (token.length === 0) {
    return value;
  }
  return value.split(token).join("[REDACTED]");
}
