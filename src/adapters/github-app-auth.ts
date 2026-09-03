import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type BotPhase = "discover" | "analyze" | "publish";

export interface GitHubAppCredentials {
  appId: number;
  privateKey: string;
  installationId: number;
}

export interface InstallationToken {
  token: string;
  expiresAt: string;
  permissions: Record<string, string>;
}

/**
 * Mint a short-lived GitHub App installation token for one Bot phase.
 * Callers request only the permissions needed for that phase and discard
 * the token when the job ends.
 */
export async function createInstallationToken(
  credentials: GitHubAppCredentials,
  permissions: Record<string, "read" | "write">,
): Promise<InstallationToken> {
  const auth = createAppAuth({
    appId: credentials.appId,
    privateKey: credentials.privateKey,
    installationId: credentials.installationId,
  });

  const result = await auth({
    type: "installation",
    permissions,
  });

  return {
    token: result.token,
    expiresAt: result.expiresAt,
    permissions: result.permissions ?? permissions,
  };
}

export function permissionsForPhase(
  phase: BotPhase,
): Record<string, "read" | "write"> {
  switch (phase) {
    case "discover":
      return {
        metadata: "read",
        contents: "read",
      };
    case "analyze":
      return {
        metadata: "read",
        contents: "read",
      };
    case "publish":
      return {
        metadata: "read",
        contents: "read",
        issues: "write",
      };
    default: {
      const _exhaustive: never = phase;
      throw new Error(`Unknown bot phase: ${String(_exhaustive)}`);
    }
  }
}

export function createInstallationOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export interface InstallationRepository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
}

export async function listInstallationRepositories(
  octokit: Octokit,
): Promise<InstallationRepository[]> {
  const repositories: InstallationRepository[] = [];

  for await (const response of octokit.paginate.iterator(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
  )) {
    for (const repo of response.data) {
      repositories.push({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
      });
    }
  }

  return repositories;
}
