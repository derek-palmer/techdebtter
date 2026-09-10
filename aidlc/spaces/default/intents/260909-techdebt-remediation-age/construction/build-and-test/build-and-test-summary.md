# Build and Test — Summary

## Sources

- `construction/code-generation/code-summary.md`, `code-generation-plan.md`
- `construction/nfr-requirements/*.md`, `construction/nfr-design/security-design.md`
- `requirements.md` NFR1, NFR2

## Overall Build Status

**Success.** `npm run build` (tsup, 3 targets: library, CLI, Action) completed
with no errors, confirmed 2026-09-10.

## Prerequisites

Node.js >=22, npm install (no dependency-set change this pass). No
additional prerequisites for the test suite (all new tests use stubbed
ports or a disposable scratch Git repo, not live Trivy/GitHub calls).

## Test Type Inventory

| Test type | Generated? | File |
|---|---|---|
| Unit (per-component) | Yes | Produced in Code Generation (`test/wiring/`, `test/cli/`, `test/action/`, `test/domain/policy.test.ts` extension) |
| Integration (key boundaries) | Yes | `integration-test-instructions.md` |
| Performance | No — N/A | `performance-test-instructions.md` (no target exists) |
| Security | Yes | `security-test-instructions.md` (NFR2.1-NFR2.7) |

## Coverage Expectations

No coverage threshold configured this pass (`requirements.md` NFR1 —
explicitly deferred). 152/152 tests pass; 22 net-new since baseline.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| NFR1 | `nfr-requirements/traceability.json` | No coverage gate configured this pass | No coverage tooling/threshold added | `vitest.config.ts` unchanged (confirmed via `git status`) | build-and-test | Met |
| NFR2.1 | `security-design.md` verification table | `analyze` produces zero working-tree diff, zero GitHub write calls | Test passes | `npx vitest run test/verification/no-mutation.test.ts` — 1 passed | build-and-test | Met |
| NFR2.2 | `security-design.md` verification table | Default dirty-worktree rejection; `--include-uncommitted` marks report non-reproducible; `publish` refuses it | Test passes | `npx vitest run test/cli/analyze-dirty-worktree.test.ts` — passed | build-and-test | Met |
| NFR2.3 | `security-design.md` verification table | All 4 policy-presence cases resolve per V9/V10; override audited/single-operation | Test passes | `npx vitest run test/domain/policy.test.ts` — passed (extended) | build-and-test | Met |
| NFR2.4 | `security-design.md` verification table | No execution path invokes repository-supplied content | Code review confirmed | `code-generation/code-summary.md` review finding | build-and-test | Met |
| NFR2.5 | `security-design.md` verification table | No write-scoped credential constructible from analyze-path dependency set; CLI/Action divergences (`readOrganizationPolicy`, cache root) preserved unchanged | Tests pass | `npx vitest run test/wiring/dependency-wiring.test.ts test/cli/bootstrap.test.ts test/action/main.test.ts` — all passed | build-and-test | Met |
| NFR2.6 | `security-design.md` verification table | 100% of external Actions SHA-pinned | Test passes | `npx vitest run test/workflows/ci-pinning.test.ts` — passed | build-and-test | Met |
| NFR2.7 | `security-design.md` verification table | `ai.ts`'s gate exported but uncalled by any application use-case | Code review confirmed | `code-generation/code-summary.md` review finding | build-and-test | Met |
| Testing Contract (standard strategy) | `code-generation-plan.md` embedded contract | 5-8 tests/component, unit + integration coverage at key boundaries | 22 new tests across 6 new files + 1 extended file | `code-summary.md`; full suite run below | build-and-test | Met |
| Build | `code-generation-plan.md` | `npm run build` succeeds | Succeeded, 3 tsup targets built | Build output captured 2026-09-10 | build-and-test | Met |
| Typecheck | `code-generation-plan.md` | `tsc --noEmit` clean | Clean, exit 0 | Captured 2026-09-10 | build-and-test | Met |
| Lint (src/test scope) | `code-generation/code-summary.md` | `eslint src test` clean | Clean, exit 0 | Captured 2026-09-10 | build-and-test | Met |
| NFR2 (no contract/schema/dependency change) | `requirements.md` | `package.json`/`package-lock.json` unchanged; no unintended public API break | Confirmed unchanged; one new export (`createAnalyzeDependencies` from `action/main.ts`) disclosed for testability, not a behavior change | `code-summary.md`; `git status` | build-and-test | Met |

## Readiness Assessment

**Build-ready.** **Test-ready.** **Deployment-ready** for this pass's
change-limited scope (documentation corrections + DependencyWiring
extraction + verification tests) — no infrastructure or deployment
artifact changes were in scope.

## Known Limitations / Outstanding Items

- FR3.2's disposition (SPEC.md C10) remains marked "unverified from within
  the repository" — a human with repo-admin access should check GitHub's
  Settings → Actions → Scheduled workflows to close this out definitively.
- Code-generation review flagged two Minor findings (accepted as known risk
  at that gate): one test assertion in the new suite is slightly weaker
  than `security-design.md`'s literal spec, and the new `createAnalyzeDependencies`
  export isn't reflected in `code-generation/traceability.json`'s NFR2 row.
- FR6 (fixture repository) was not built this pass — NFR2.1/NFR2.2's tests
  use a disposable scratch repo as an interim substitute, per
  `security-design.md`'s own stated fallback.
