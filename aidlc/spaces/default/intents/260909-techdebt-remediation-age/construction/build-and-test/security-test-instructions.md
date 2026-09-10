# Build and Test — Security Test Instructions

## Sources

- `construction/nfr-design/security-design.md` (verification-mechanics table, NFR2.1-NFR2.7)
- `construction/code-generation/code-summary.md`

## Scope

`security-requirements.md`/`security-design.md` exist and are substantive
(unlike performance/scalability/reliability/observability), so per Step 3-7
security test instructions are generated even at Standard strategy.

## Test Framework

Vitest (existing) for the five automated checks; manual code review for
the two review-only checks (NFR2.4, NFR2.7), already performed and
recorded during Code Generation.

## How to Run

```bash
npx vitest run test/verification/no-mutation.test.ts test/cli/analyze-dirty-worktree.test.ts test/domain/policy.test.ts test/wiring/dependency-wiring.test.ts test/workflows/ci-pinning.test.ts
```

## Coverage Per Invariant

| NFR ID | Automated / Review | Status |
|---|---|---|
| NFR2.1 (no mutation during analyze) | `test/verification/no-mutation.test.ts` | Automated, passing |
| NFR2.2 (dirty-worktree rejection) | `test/cli/analyze-dirty-worktree.test.ts` | Automated, passing |
| NFR2.3 (policy authority chain) | `test/domain/policy.test.ts` (extended) | Automated, passing |
| NFR2.4 (bot execution boundary) | Code review of `src/adapters/process.ts`'s 3 `execa` call sites | Reviewed during Code Generation — confirmed no repository-content-sourced arguments |
| NFR2.5 (write-token isolation) | `test/wiring/dependency-wiring.test.ts`, `test/cli/bootstrap.test.ts`, `test/action/main.test.ts` | Automated, passing |
| NFR2.6 (Actions SHA-pinning) | `test/workflows/ci-pinning.test.ts` | Automated, passing |
| NFR2.7 (AI-use opt-in gate) | Code review confirming `src/adapters/ai.ts`'s gate remains uncalled by any application use-case | Reviewed during Code Generation — confirmed uncalled |

## Test Data / Environment Setup

Same as `integration-test-instructions.md` — disposable scratch Git repos
for fixture-dependent checks; no external service credentials required
(no live GitHub/Trivy calls in the test suite).
