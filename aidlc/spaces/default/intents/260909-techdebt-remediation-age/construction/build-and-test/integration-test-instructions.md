# Build and Test — Integration Test Instructions

## Sources

- `construction/code-generation/unit-test-instructions.md`
- `construction/nfr-design/security-design.md`

## Scope

Standard test strategy requires integration coverage at key boundaries.
This pass's key boundary is the CLI/Action-to-DependencyWiring integration
(the analyze-path adapter set actually gets constructed correctly for each
entry point) and the fixture-repo-dependent invariants (NFR2.1, NFR2.2).

## Test Framework

Vitest (existing), same runner as unit tests — no separate integration
framework introduced.

## How to Run

```bash
npx vitest run test/wiring/dependency-wiring.test.ts test/cli/bootstrap.test.ts test/action/main.test.ts test/verification/no-mutation.test.ts test/cli/analyze-dirty-worktree.test.ts
```

## Expected Coverage

These five files already exist (written in Code Generation) and already
pass as part of the 152/152 suite. This instruction file documents them as
the integration layer's coverage rather than introducing new tests — Code
Generation's test-after ordering already produced them at the "Business
logic - write and run its tests" step.

## Test Data / Environment Setup

`test/cli/analyze-dirty-worktree.test.ts` and `test/verification/no-mutation.test.ts`
use a disposable scratch Git repository (`git init` in a temp dir),
constructed inline per `security-design.md`'s Test Harness Notes — not the
FR6 fixture repository, which has not been built this pass (out of scope;
`requirements.md` treats it as a later Ideation-approved follow-on).
