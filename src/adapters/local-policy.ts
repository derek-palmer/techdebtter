import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RepositoryPolicy } from "../domain/policy.js";
import {
  type PolicyLayerState,
  validatePolicy,
} from "../domain/policy.js";
import { PolicyError } from "../domain/policy-error.js";

export async function readRepositoryPolicyFile(
  localPath: string,
): Promise<PolicyLayerState<RepositoryPolicy>> {
  const filePath = join(localPath, ".techdebtter.yml");
  try {
    const text = await readFile(filePath, "utf8");
    const validated = validatePolicy(text, "repository");
    if (!validated.ok) {
      throw new PolicyError("Invalid repository policy", validated.errors);
    }
    return { state: "present", value: validated.value as RepositoryPolicy };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { state: "absent" };
    }
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
