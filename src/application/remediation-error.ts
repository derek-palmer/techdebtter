export type RemediationErrorCode =
  | "unsupported-finding"
  | "unsupported-lockfile"
  | "not-direct-dependency"
  | "budget-exhausted"
  | "missing-coordinates";

export class RemediationError extends Error {
  readonly code: RemediationErrorCode;

  constructor(code: RemediationErrorCode, message: string) {
    super(message);
    this.name = "RemediationError";
    this.code = code;
  }
}
