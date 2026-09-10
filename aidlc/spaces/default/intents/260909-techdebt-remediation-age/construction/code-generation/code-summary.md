# Code Generation — Summary

## Sources

- `code-generation-plan.md` (this stage's approved 10-step plan)
- `unit-test-instructions.md`
- `functional-design/functional-spec.md`, `rules.md`
- `nfr-design/security-design.md`

## Scope

Verify-and-fix pass covering FR1-FR5 and NFR1-NFR2 (including NFR2.1-NFR2.7)
directly — no Units Generation, one implementation pass. No new product
capability was added; every change is a documentation correction, a
narrow, behavior-preserving wiring extraction, or a verification test/code
review against existing invariants.

## Files created

- `src/wiring/dependency-wiring.ts` — the `DependencyWiring` construction
  factory (FR4.1), wiring the `analyze`-path `AnalyzeDependencies` set
  (`repositorySource`, `detectors`, `enrichmentProviders`,
  `readRepositoryPolicy`, `clock`) that was previously duplicated
  independently in `src/cli/bootstrap.ts` and `src/action/main.ts`.
  `cacheRoot` and `readOrganizationPolicy` remain caller-supplied per
  `functional-spec.md`'s narrowed scope, so each entry point's existing
  divergent behavior (CLI's hardcoded `"unverifiable"` stub vs. Action's
  live GitHub read; CLI's `join(tmpdir(), "techdebtter-cache")` vs.
  Action's `/tmp/techdebtter-action-cache`) is preserved unchanged (BR1.2).
- `test/wiring/dependency-wiring.test.ts` — asserts the constructed
  `AnalyzeDependencies` set's shape, that the caller-supplied
  `readOrganizationPolicy` is passed through unmodified (both CLI-stub and
  Action-live-read forms), that no write-scoped GitHub client is attached,
  and that independent calls with different `cacheRoot`s construct
  independent adapter instances.
- `test/cli/bootstrap.test.ts` — regression-equivalence check:
  `createDefaultAnalyzeDependencies()` still produces the same shape and
  the same hardcoded `"unverifiable"` stub as before the refactor.
- `test/action/main.test.ts` — regression-equivalence check:
  `createAnalyzeDependencies(gateway)` still produces the same shape and
  still delegates to `gateway.readOrganizationPolicy` as before the
  refactor.
- `test/verification/no-mutation.test.ts` — NFR2.1: runs `analyze()`
  against a real disposable scratch Git repository and asserts zero
  working-tree diff (file contents and `git status --porcelain` both
  unchanged) across the run, plus a structural assertion (via the existing
  `assertAnalyzeIsReadOnly` guard) that the constructed dependency set
  exposes no write-scoped GitHub method at all.
- `test/cli/analyze-dirty-worktree.test.ts` — NFR2.2: asserts a dirty
  worktree is rejected by default (`dirty-worktree`, non-zero exit),
  `--include-uncommitted` produces a report marked `reproducible: false`,
  and `publish` then refuses that report (`non-reproducible`).
- `test/workflows/ci-pinning.test.ts` — NFR2.6: parses the checked-in
  `.github/workflows/ci.yml` and asserts every `uses:` reference is pinned
  to a full 40-character commit SHA.

## Files modified

- `src/cli/bootstrap.ts` — `createDefaultAnalyzeDependencies` now calls
  `createAnalyzeDependencies` from `src/wiring/dependency-wiring.ts`
  instead of constructing the adapter set inline. Behavior unchanged: same
  `cacheRoot` resolution/memoization, same hardcoded
  `readOrganizationPolicy` stub. `createDefaultRemediateDependencies` and
  the remediate-path wiring were not touched (out of `DependencyWiring`'s
  scope per `functional-spec.md`).
- `src/action/main.ts` — the module-local `createAnalyzeDependencies`
  helper now delegates to the same shared factory (imported as
  `wireAnalyzeDependencies` to avoid a name collision with the existing
  local function name, which is retained and now exported for
  testability). Behavior unchanged: same `"/tmp/techdebtter-action-cache"`
  cache root, same live `gateway.readOrganizationPolicy` +
  `parseOrganizationPolicy` read. `runRemediatePhase`'s wiring was not
  touched.
- `test/domain/policy.test.ts` — extended with a
  "policy-presence resolution matrix (NFR2.3, SPEC.md V9/V10)" describe
  block covering all four policy-presence cases (present-valid,
  present-invalid, confirmed-absent, unverifiable) plus a statelessness
  assertion documenting why the CLI's per-invocation explicit-selection
  requirement (already asserted in `test/cli/publish.test.ts`) constitutes
  a single-operation, audited override per V12.
- `README.md` (FR1) — opening description rewritten to state the
  single-detector (Trivy) analysis scope plainly; the eight-category
  roadmap language moved into a new "Roadmap / Vision" section explicitly
  marked as not-yet-implemented; corrected the remediation-scope sentence
  to name the five ecosystems (npm, Python, Docker, Ruby, Terraform)
  already covered by the existing remediators (this reflects the current
  `src/adapters/*-remediator.ts` surface — no code change); added
  `observe`/`verify` subcommand documentation to the Usage section.
- `SPEC.md` (FR2.1, FR3.2) — added `FindingVerificationGateway` to I9's
  port list; added a one-line note to C10 recording that the scheduled
  smoke-test workflow's existence could not be verified from within the
  repository this pass.
- `docs/architecture.md` (FR2.2) — added `FindingVerificationGateway` to
  the "External ports" list (six ports -> seven), with a one-line
  description matching `src/domain/ports.ts`'s actual interface.

## Investigation finding: FR3.1 (SPEC.md C10)

`SPEC.md` C10 claims "live external smoke tests scheduled, non-blocking."
`.github/workflows/` contains exactly one workflow, `ci.yml`, triggered on
`push`/`pull_request` only — no `schedule:` trigger, and no other workflow
file exists in the repository. `templates/controller-workflow.yml` (the
org-side bot-controller template, not part of this repository's own CI)
does have a `schedule:` trigger, but it runs the product's own
discover/analyze/publish/verify/remediate/observe phases, not a "smoke
test" of TechDebtter's own build in the sense C10 describes.

This investigation cannot check GitHub's repository Settings → Actions →
Scheduled workflows UI, nor any org-level scheduled workflow — those are
outside what is visible from within the repository's file tree. **Finding:
inconclusive from within the repository; requires a human with repo-admin
access to check GitHub's Settings UI to confirm or refute.**

## Disposition: FR3.2

Per FR3.1's inconclusive finding and NFR2's prohibition on adding new
capability without confirming it doesn't already exist elsewhere, the
safest disposition is **recorded as deferred work**: no new workflow was
built speculatively, and C10's claim was not asserted false or removed
(doing either would risk being wrong in either direction). `SPEC.md` C10
now carries a one-line note: "(Unverified from within the repository as of
this pass: ... requires a human with repo-admin access to check and was
not confirmed or refuted during this pass.)"

## Code review findings

### NFR2.4 — `src/adapters/process.ts`'s `execa` call sites

`grep -rn "execa(" src/` shows exactly one call site: `src/adapters/process.ts`
line 13 (`execProcessRunner`). The three consumers of that runner —
`src/adapters/git.ts`, `src/adapters/trivy.ts`, `src/adapters/gh-auth.ts` —
each pass a hardcoded command string (`"git"`, `"trivy"`, `"gh"`) and a
hardcoded/literal args array (e.g. `["rev-parse", "--is-inside-work-tree"]`,
`["remote", "get-url", "origin"]`, `["auth", "status"]`). None of the
arguments are sourced from repository file content. None of the five
ecosystem remediators (`src/adapters/npm-remediator.ts`,
`python-remediator.ts`, `docker-remediator.ts`, `ruby-remediator.ts`,
`terraform-remediator.ts`) call `execa`/`runCommand` at all — confirmed via
`grep -rn "execa\|runCommand" src/adapters/*remediator*.ts` (zero matches).
**Pass**: `process.ts`'s three call sites construct only fixed,
TechDebtter-owned commands with no repository-content-sourced arguments;
zero ecosystem remediator reaches `execa`/`runCommand`.

### NFR2.7 — `src/adapters/ai.ts`'s AI policy gate

`grep -rn "buildAiTaskPayload\|AiPolicyGate\|assertAiAllowed\|adapters/ai" src/ --include=*.ts`
outside `ai.ts`/`index.ts` returns zero matches — none of the four
application use-cases (`analyze.ts`, `publish.ts`, `remediate.ts`,
`verify.ts`/`bot.ts`) call into the AI gate. `src/index.ts` re-exports
`AiPolicyError`, `assertAiAllowed`, `buildAiTaskPayload` (values) and
`AiPolicyGate` (type) as public library surface, and `test/adapters/ai.test.ts`
already covers opt-in enforcement, purpose allow-listing, and evidence
hashing/redaction, unchanged by this pass. **Pass**: the gate exists as
exported infrastructure for any future caller and is not bypassed by any
current caller, since there is no current caller.

## Lint note (out of scope)

`npm run lint` reports 95 pre-existing errors, all under `.claude/tools/`
(the AI-DLC framework shell's own TypeScript tooling, not this project's
application code). `src/` and `test/` are lint-clean. These findings
predate this pass, are unrelated to FR1-FR5/NFR1-NFR2, and are out of this
verify-and-fix pass's scope; not modified.

## Test coverage summary

- Baseline (Step 1): `npx vitest run --reporter=dot` — 28 test files,
  130/130 tests passing, before any change.
- Final: `npx vitest run` — 34 test files, 152/152 tests passing
  (130 baseline + 22 new: 5 in `dependency-wiring.test.ts`, 3 in
  `bootstrap.test.ts`, 3 in `main.test.ts`, 2 in `no-mutation.test.ts`, 2
  in `analyze-dirty-worktree.test.ts`, 5 in the new `policy.test.ts`
  describe block, 2 in `ci-pinning.test.ts`).
- `npx tsc --noEmit` — clean, no errors.
- `npm run lint` — clean under `src/` and `test/`; pre-existing errors
  under `.claude/tools/` only (see Lint note above).

No coverage threshold was configured, per NFR1's explicit deferral.

## Deviations from plan

- The plan's Step 7 named `test/cli/bootstrap.test.ts` and
  `test/action/main.test.ts`; testing `action/main.ts`'s
  `createAnalyzeDependencies` directly required exporting it (it was a
  module-local helper). This is a visibility-only change — no exported
  symbol's behavior, signature, or `action.yml`'s public contract changed
  — and was necessary to write a genuine regression-equivalence test
  rather than only an indirect one through `runAction`.
- `unit-test-instructions.md`'s NFR2.1 row named
  `test/verification/no-mutation.test.ts` as an acceptable alternative to
  extending `test/application/analyze.test.ts`; that new file was created
  rather than extending the existing one, since it needed a real scratch
  Git repository (unlike `analyze.test.ts`'s pure-stub pattern) and a
  separate file kept that distinction clear.
- README's remediation-scope sentence was corrected beyond what FR1.1/FR1.2
  explicitly named, to state the actual five-ecosystem remediation surface
  (npm, Python, Docker, Ruby, Terraform) rather than leaving stale
  "Additional static remediators cover..." language that undercounted
  what the existing `*-remediator.ts` adapters already implement. This is
  a documentation correction of the same character as FR1.1/FR1.2 (fixing
  an inaccurate capability description), not a new requirement.
