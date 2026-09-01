export type PrerequisiteCode =
  | "not-a-git-repository"
  | "missing-origin"
  | "dirty-worktree"
  | "trivy-missing"
  | "trivy-unsupported-version"
  | "trivy-scan-failed";

export class PrerequisiteError extends Error {
  readonly code: PrerequisiteCode;

  constructor(code: PrerequisiteCode, message: string) {
    super(message);
    this.name = "PrerequisiteError";
    this.code = code;
  }
}
