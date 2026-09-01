export class PolicyError extends Error {
  readonly errors: string[];

  constructor(message: string, errors: string[]) {
    super(message);
    this.name = "PolicyError";
    this.errors = errors;
  }
}
