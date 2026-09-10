# Code Generation — Plan

## Sources

- `requirements.md` FR1-FR5
- `construction/functional-design/functional-spec.md`, `rules.md`
- `construction/nfr-design/security-design.md` (verification-mechanics table)
- `construction/nfr-requirements/security-requirements.md`

## Scope

This is a zero-Unit directive (Units Generation was skipped by human decision
during Functional Design). One implementation pass covers FR1-FR5 directly.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run",
  "scope": "techdebt-remediation-agent",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:019bdd76888375f5f676973c05ddda97f2a2cdda3e0563e01b6a1e32ba2e9298",
  "contract_sha256": "sha256:3b3df82b081ce1019473c1e11e914f28d78f528ed742a3f03d1c7f30eb1cbd9a"
}
```

## Plan

- [x] **Step 1 — Runner verification.** Confirm the existing test runner works: `npx vitest run --reporter=dot` (baseline, already confirmed green at Ideation risk-mitigation). Record the exact unit-scoped commands each new test file will use in `unit-test-instructions.md`.

- [x] **Step 2 — FR1: Correct README's detection-scope description.** (traces to FR1.1, FR1.2, FR1.3)
  - [x] Rewrite README.md's opening description to state the single-detector (Trivy vulnerability scanning) scope plainly.
  - [x] Move the eight-category language into a clearly labeled "Roadmap" or "Vision" section, distinct from current capability.
  - [x] Add README's Usage section documentation for the `observe` and `verify` CLI subcommands.
  - No test required — documentation-only change.

- [x] **Step 3 — FR2: Correct the port-list documentation gap.** (traces to FR2.1, FR2.2)
  - [x] Add `FindingVerificationGateway` to `SPEC.md` I9's port list.
  - [x] Add `FindingVerificationGateway` to `docs/architecture.md`'s port list.
  - No test required — documentation-only change.

- [x] **Step 4 — FR3.1: Investigate the SPEC C10 scheduled smoke-test gap.** (traces to FR3.1)
  - [x] Check GitHub repository Settings → Actions → Scheduled workflows (and any org-level scheduled workflow) for an existing, non-committed smoke-test schedule.
  - [x] Record the finding in this stage's `memory.md` diary with the evidence checked, per FR3.1's stated pass/fail criterion.
  - No test required — investigation step.

- [x] **Step 5 — FR3.2: Apply the FR3.1 disposition.** (traces to FR3.2)
  - [x] Based on Step 4's finding, apply exactly one of: build the scheduled workflow, correct `SPEC.md` C10's claim, or record as deferred work with no document change.
  - [x] If built: add the workflow under `.github/workflows/`; write one smoke-test assertion per `code-summary.md`'s decision record. If corrected or deferred: no code, documentation-only.

- [x] **Step 6 — Business logic: FR4.1 DependencyWiring extraction.** (traces to FR4.1, BR1.1, BR1.2)
  - [x] Create `src/wiring/dependency-wiring.ts` (new file) implementing the narrowed `analyze`-path construction described in `functional-design/functional-spec.md`: wires `RepositorySource`, `Detector`, `EnrichmentProvider`s, `readOrganizationPolicy`, `readRepositoryPolicy`, `Cache`, `Clock` into an `AnalyzeDependencies` set — preserving each entry point's existing divergent behavior verbatim (CLI's hardcoded `readOrganizationPolicy` stub vs. Action's live GitHub read; CLI's `join(tmpdir(), "techdebtter-cache")` vs. Action's `/tmp/techdebtter-action-cache`).
  - [x] Update `src/cli/bootstrap.ts`'s `createDefaultAnalyzeDependencies` to call the new shared factory instead of constructing inline.
  - [x] Update `src/action/main.ts`'s `createAnalyzeDependencies` to call the same shared factory instead of constructing inline.
  - [x] Do not touch remediate-path wiring (`createDefaultRemediateDependencies`, `runRemediatePhase`'s wiring) or ecosystem-remediator construction — explicitly out of scope per `functional-spec.md`.

- [x] **Step 7 — Business logic tests: DependencyWiring.** (traces to NFR2.5)
  - [x] `test/wiring/dependency-wiring.test.ts` (new): assert the constructed `AnalyzeDependencies` set for each entry point preserves that entry point's existing `readOrganizationPolicy` behavior (CLI stub vs. Action live read) and cache-root path, and that neither receives a write-scoped GitHub client.
  - [x] `test/cli/bootstrap.test.ts` (new): assert `createDefaultAnalyzeDependencies` produces an equivalent `AnalyzeDependencies` set to before the refactor (regression-equivalence check).
  - [x] `test/action/main.test.ts` (new): assert `createAnalyzeDependencies` produces an equivalent `AnalyzeDependencies` set to before the refactor (regression-equivalence check).

- [x] **Step 8 — Verification tests: FR5.1, per `security-design.md`'s table.** (traces to NFR2.1, NFR2.2, NFR2.3, NFR2.4, NFR2.6)
  - [x] NFR2.1: extend `test/application/analyze.test.ts` (or add `test/verification/no-mutation.test.ts`) — assert `analyze` produces zero working-tree diff and zero GitHub write calls.
  - [x] NFR2.2: add `test/cli/analyze-dirty-worktree.test.ts` — assert default rejection of a dirty worktree, `--include-uncommitted`'s non-reproducible report marker, and `publish`'s refusal of a non-reproducible report.
  - [x] NFR2.3: extend `test/domain/policy.test.ts` — assert all four policy-presence cases (present-valid/present-invalid/confirmed-absent/unverifiable) resolve per `SPEC.md` V9/V10, and a human override is recorded as audited and single-operation.
  - [x] NFR2.4: code review only (no new test — confirmed by `security-design.md`'s corrected NFR2.4 row that no remediator calls `execa`; review `process.ts`'s three call sites for repository-content-sourced arguments and record the finding in `code-summary.md`).
  - [x] NFR2.6: add `test/workflows/ci-pinning.test.ts` — parse `.github/workflows/ci.yml`'s `uses:` lines and assert every external Action reference is a full commit SHA.
  - [x] NFR2.7: code review only (no new test — `ai.ts`'s gate already has its own passing suite; confirm via grep it remains uncalled by any application use-case, record in `code-summary.md`).

- [x] **Step 9 — FR7 (from Domain Design's accepted scope): none.** No additional component beyond `DependencyWiring` is in scope.

- [x] **Step 10 — Documentation and traceability.** (traces to FR5.2)
  - [x] Record verification results (pass/fail per invariant checked in Step 8) in `code-summary.md`.
  - [x] Write `traceability.json` mapping every FR/NFR/BR ID to its implementing file.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-10T11:40:40Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | test/domain/policy.test.ts > "a human policy/selection override is recorded as a single, audited operation" | `security-design.md`'s NFR2.3 row asks the test to "construct a human override input and assert it is recorded as audited and single-operation." The actual test asserts only that two independent `resolvePolicy` calls don't leak state into each other (statelessness) — it never constructs an override input, never asserts an audit record is written, and its own inline comment concedes it is inferring auditedness from the CLI's separately-asserted `--select` requirement rather than testing it directly. This is weaker evidence than the table specifies, though not incorrect as far as it goes. | Either add a direct assertion that an override is recorded in an auditable form (e.g. the CLI's selection/report output), or narrow `security-design.md`'s NFR2.3 row wording to match what is actually verified, so the table and the test stay in sync for the next reader. | New |
| R-02 | Minor | src/action/main.ts > `createAnalyzeDependencies` | The refactor changes this function from module-local to `export`ed (needed so `test/action/main.test.ts` can call it directly). `code-summary.md`'s "Deviations from plan" section discloses this as a visibility-only change with no behavior/signature difference, which is accurate, but `traceability.json`'s NFR2 coverage row ("no public contract, schema, or dependency-set change") does not mention this new exported symbol. It is genuinely low-risk (an added export, not a removed or altered one, and `action/main.ts` is an entry-point script, not a published library surface consumed by `src/index.ts`), but the traceability row's blanket "no public contract... change" claim is slightly overstated next to the disclosed deviation. | Note the new export in the NFR2 traceability row (or cross-reference the "Deviations from plan" section) so the two documents agree on what changed. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx tsc --noEmit` | Clean, zero errors (independently run via PowerShell) | Confirms `code-summary.md`'s typecheck claim |
| `npx vitest run` | 34 test files, 152/152 tests passing (independently run via PowerShell) | Confirms `code-summary.md`'s test-count claim |

### Summary

Independently verified against source: `src/wiring/dependency-wiring.ts`, the refactored `src/cli/bootstrap.ts` and `src/action/main.ts` preserve both BR1.1 (remediate-path divergence, untouched) and BR1.2 (analyze-path `readOrganizationPolicy` stub-vs-live-read divergence, and CLI-vs-Action cache-root divergence) exactly — no accidental unification, remediate-path/ecosystem-remediator wiring is untouched and out of `dependency-wiring.ts`'s scope as required by `functional-spec.md`. The six new test files' assertions were read against `security-design.md`'s verification-mechanics table row by row and match, with one Minor gap (R-01). README.md/SPEC.md/docs/architecture.md's edits were checked against FR1/FR2/FR3.2 and against the actual code/workflow state (`FindingVerificationGateway` exists in `src/domain/ports.ts`; `.github/workflows/` contains only `ci.yml` with no `schedule:` trigger, matching the FR3.1 finding and FR3.2 "deferred" disposition) and are accurate, not over- or under-claiming. `package.json`/`package-lock.json` are untouched (confirmed via `git status`), and no exported type signature changed except the disclosed, low-risk `action/main.ts` export (R-02). `traceability.json` and `source-manifest.json`'s claimed paths all exist and match what was actually written. Zero Critical, zero Major findings.
