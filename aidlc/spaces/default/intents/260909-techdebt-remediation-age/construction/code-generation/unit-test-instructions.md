# Code Generation — Unit Test Instructions

## Sources

- `construction/nfr-design/security-design.md`
- `construction/functional-design/functional-spec.md`, `rules.md`

## Test Framework

Vitest ^4.1.11 (existing, `vitest.config.ts`). No new framework introduced.

## Scope Floor

Standard strategy: 5-8 tests per component, unit + integration coverage for
key boundaries. This pass's actual test surface (per the plan) is narrower
than a typical unit — one new component (`DependencyWiring`) plus six
verification tests for existing invariants — so the floor is satisfied by
covering that surface thoroughly rather than padding with unrelated tests.

## Commands (unit-scoped, exact)

Run each new/extended file individually during development, per the
test-after ordering (implement, then write and run):

```bash
npx vitest run test/wiring/dependency-wiring.test.ts
npx vitest run test/cli/bootstrap.test.ts
npx vitest run test/action/main.test.ts
npx vitest run test/application/analyze.test.ts
npx vitest run test/cli/analyze-dirty-worktree.test.ts
npx vitest run test/domain/policy.test.ts
npx vitest run test/workflows/ci-pinning.test.ts
```

Full-suite regression check (after all steps, before the stage gate):

```bash
npx vitest run
```

## Expected Coverage Targets

No new coverage threshold is configured this pass (`requirements.md` NFR1 —
explicitly deferred). Each new/extended file should exercise its
corresponding invariant's stated Pass/Fail criterion from
`security-design.md`'s verification-design table; existing suite must
remain green throughout (130/130 baseline, confirmed at Ideation
risk-mitigation).

## Mocking/Stubbing Guidance

- `dependency-wiring.test.ts`, `bootstrap.test.ts`, `main.test.ts`: construct
  `DependencyWiring`/`createDefaultAnalyzeDependencies`/`createAnalyzeDependencies`
  with stub port implementations (matching existing test patterns already in
  `test/cli/analyze.test.ts` and `test/action/controller.test.ts`); assert on
  the shape of the returned dependency set (field-by-field), not on live I/O.
- `analyze-dirty-worktree.test.ts`: use a disposable local scratch Git repo
  (`git init` in a temp dir via existing test helpers in `test/cli/helpers.ts`
  if present) rather than requiring the fixture repository from FR6 — per
  `security-design.md`'s Test Harness Notes, this is an acceptable interim
  substitute.
- `policy.test.ts` extension: construct policy fixtures directly (no I/O) —
  matches the existing file's pattern.
- `ci-pinning.test.ts`: parse the real, checked-in `.github/workflows/ci.yml`
  — no mocking needed, this is a static file-content assertion.

## Test Data Management

No new fixture data required beyond what `test/fixtures/` already provides,
except a disposable scratch Git repo constructed inline for
`analyze-dirty-worktree.test.ts` (not persisted, not committed).
