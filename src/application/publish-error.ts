export type PublishErrorCode =
  | "unknown-selection"
  | "duplicate-selection"
  | "non-reproducible"
  | "invalid-report"
  | "unverified-policy"
  | "scope-mismatch"
  | "empty-selection";

export class PublishError extends Error {
  readonly code: PublishErrorCode;

  constructor(code: PublishErrorCode, message: string) {
    super(message);
    this.name = "PublishError";
    this.code = code;
  }
}
