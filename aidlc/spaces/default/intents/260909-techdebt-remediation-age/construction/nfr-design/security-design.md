# NFR Design — Security Design

## Sources

- `nfr-requirements/security-requirements.md` NFR2.1-NFR2.7
- `requirements.md` FR5.1, FR6 (fixture repository)
- `codekb/techdebtter/code-structure.md` (test layout: `test/` mirrors `src/` 1:1)

## Scope

This design specifies HOW each of `security-requirements.md`'s NFR2.1-NFR2.7
invariants gets verified in Code Generation — test location, the
fixture-repo scenario each check needs, the concrete assertion, and the
pass/fail criterion. No new security control is designed; every item below
verifies existing behavior.

## Verification Design

| NFR ID | Test Location | Fixture-Repo Scenario Needed | Assertion | Pass/Fail Criterion |
|---|---|---|---|---|
| NFR2.1 | `test/application/analyze.test.ts` (extend existing suite, or new `test/verification/no-mutation.test.ts`) | A clean fixture repo with at least one known vulnerability Trivy will detect | Snapshot the repo's working-tree state and GitHub API call log before/after `analyze`; assert zero diff and zero write-scoped API calls | Pass: identical working-tree hash and zero GitHub write calls recorded |
| NFR2.2 | `test/cli/analyze-dirty-worktree.test.ts` (new) | Fixture repo with an uncommitted local edit | Run `analyze` without `--include-uncommitted` (expect rejection, non-zero exit); run again with the flag (expect a report with `reproducible: false`); attempt `publish` on that report (expect refusal) | Pass: default run rejects; flagged run produces a marked-non-reproducible report; publish refuses it |
| NFR2.3 | `test/domain/policy.test.ts` (extend existing suite) | N/A — policy resolution is unit-testable against constructed policy fixtures, no repo scenario needed | Construct present-valid / present-invalid / confirmed-absent / unverifiable organization-policy inputs; assert halt/fallback/block per case; construct a human override input and assert it is recorded as audited and single-operation | Pass: all four policy-presence cases resolve per `SPEC.md` V9/V10; override case is recorded with an audit entry and does not persist beyond one operation |
| NFR2.4 | Code review of `src/adapters/process.ts` (the sole `execa`/`runCommand` call site in `src/`) + `test/adapters/npm-remediator.test.ts` and `test/adapters/ecosystem-remediators.test.ts` (existing suites, for architectural context) | N/A — this is a code-path/architecture check, not a runtime scenario | **Corrected premise (post-review):** none of the five ecosystem remediators call `execa`/`runCommand` at all — they are pure manifest/lockfile editors (`NpmPackageLockRemediator.plan()` and equivalents produce edit plans, not subprocess calls). The only `execa` call sites in `src/` are in `process.ts`, used by `git.ts`, `trivy.ts`, and `gh-auth.ts` — none of which execute analyzed-repository-supplied content; each constructs a fixed, TechDebtter-owned command (`git`, `trivy`, `gh`) with arguments TechDebtter controls. Grep/review those three call sites specifically for any argument sourced from repository content; `npm-remediator.test.ts` (npm) and `ecosystem-remediators.test.ts` (Python/Docker/Ruby/Terraform, 157 lines) both assert `plan()` output shape only, confirming no remediator reaches `execa` at all — a stronger form of this invariant than "asserts only known commands run," since there is no command-execution path in remediators to begin with | Pass: `process.ts`'s three call sites (`git.ts`, `trivy.ts`, `gh-auth.ts`) construct only fixed, TechDebtter-owned commands with no repository-content-sourced arguments; zero ecosystem remediator calls `execa`/`runCommand` |
| NFR2.5 | Code review of `DependencyWiring` (post-FR4.1) + new `test/cli/bootstrap.test.ts`, new `test/action/main.test.ts` (verified: neither exists today — `test/cli/` has no `bootstrap.test.ts` and `test/action/` has only `controller.test.ts`, no `main.test.ts`; no existing test covers `createDefaultAnalyzeDependencies`/`createAnalyzeDependencies`'s credential-scoping behavior) | N/A — construction-time inspection, no runtime repo scenario | Confirm the constructed `AnalyzeDependencies` set never receives a write-scoped GitHub client or token as a `Detector`/`EnrichmentProvider` constructor argument; confirm the GitHub App token minted for the analyze phase requests only read scopes | Pass: no write-scoped credential is constructible from the analyze-path dependency set; GitHub App analyze-phase token permissions include no write scope |
| NFR2.6 | `test/workflows/ci-pinning.test.ts` (new, or a lint-style script) | N/A — static check against `.github/workflows/ci.yml` | Parse `ci.yml`'s `uses:` lines; assert every reference matches a 40-character hex SHA, not a tag/branch | Pass: 100% of external Action references are full-SHA pinned |
| NFR2.7 | Code review of `src/adapters/ai.ts` + `test/adapters/ai.test.ts` (existing suite) | N/A — construction-time/code-path inspection, no runtime repo scenario | **Corrected premise (post-review):** `src/adapters/ai.ts` exists and is publicly exported from `src/index.ts` (`AiPolicyGate`, `buildAiTaskPayload`, `assertAiAllowed`, `AiPolicyError`) — this is not absence of AI-related code, it is the opt-in/redaction/provenance *gate* `SPEC.md` V29 itself requires, already implemented as a library primitive with its own passing test suite covering opt-in enforcement, purpose allow-listing, and evidence hashing/redaction. Confirm via grep that `buildAiTaskPayload`/`AiPolicyGate` are not called from any of the four application use-cases (`analyze.ts`, `publish.ts`, `remediate.ts`, `verify.ts`/`bot.ts`) — i.e. the gate exists as exported infrastructure but no current CLI/Action code path invokes AI, so V29 is satisfied both by the gate's existence (for any future caller) and by no current caller bypassing it | Pass: `ai.ts`'s gate functions are exported but uncalled by any of the four application use-cases; `ai.test.ts`'s existing assertions on opt-in/redaction/provenance remain green |

## Test Harness Notes

- Fixture-repo-dependent checks (NFR2.1, NFR2.2) require FR6.1's fixture
  repository to exist before they can run as integration tests; until then
  they may run against a disposable local scratch clone (`git init` in a
  temp dir) as an interim substitute — this does not block Code Generation
  from writing the test logic itself.
- All other checks (NFR2.3-NFR2.7) are unit-testable or static/code-review
  checks against the existing repository and do not depend on FR6.

## Authentication / Authorization Architecture

Unchanged this pass. GitHub App authentication (`src/adapters/github-app-auth.ts`,
`permissionsForPhase`) already scopes tokens per bot-controller phase;
NFR2.5's verification confirms the `analyze` phase specifically requests
no write scope. No new auth flow is designed.

## Encryption, Input Validation, Secrets Management

No new design: encryption is not applicable (TechDebtter has no data store
of its own beyond the filesystem cache); input validation already exists
at report/policy schema boundaries (Ajv2020, per `code-structure.md`) and
is unchanged; secrets management is unchanged — GitHub App credentials
flow through the existing `github-app-auth.ts` path, not touched by FR1-FR5.

## Review

**Request Challenge:** review:0604566ccdb4469276e76a22285cd962
**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-10T04:23:10Z
**Iteration:** 2

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | security-design.md > Verification Design table, NFR2.5 row | Re-verified against the filesystem: `test/cli/` contains `analyze.test.ts`, `capabilities.test.ts`, `helpers.ts`, `observe-verify.test.ts`, `publish.test.ts`, `remediate.test.ts`, `tracer.test.ts` — no `bootstrap.test.ts`. `test/action/` contains only `controller.test.ts` — no `main.test.ts`. The row correctly reads "new `test/cli/bootstrap.test.ts`, new `test/action/main.test.ts`" with an explicit note that both were verified not to exist, and `traceability.json`'s NFR2.5 target matches. | None — fix confirmed accurate. | Resolved |
| R-02 | Minor | security-design.md > Verification Design table, NFR2.4 row | The row previously cited a plural glob implying multiple existing per-ecosystem test files. Re-verified: `test/adapters/` has no `python-remediator.test.ts`, `docker-remediator.test.ts`, `ruby-remediator.test.ts`, or `terraform-remediator.test.ts` as separate files (Python/Docker/Ruby/Terraform coverage lives in the single `ecosystem-remediators.test.ts`, per R-05 below). The overstated-glob problem remains fixed. | None. | Resolved |
| R-03 | Minor | security-design.md > NFR2.4 row vs. security-requirements.md NFR2.4 | NFR2.4's "code review only" verification approach still faithfully matches `security-requirements.md`'s own NFR2.4 approach. Unchanged from prior iterations: consistent, not a defect. | No correction required. | Accepted risk |
| R-04 | Resolved | security-design.md > Verification Design table, NFR2.4 row, Assertion column | Re-verified against the filesystem and source. `grep -rn "execa(" src/` shows exactly one call site in the whole codebase: `src/adapters/process.ts` line 13. `grep -n "runCommand\|execa" src/adapters/git.ts src/adapters/trivy.ts src/adapters/gh-auth.ts` returns no direct matches (they go through the injected `ProcessRunner`, imported from `process.js`) — and reading all three files in full confirms every `runner.run(...)` call passes a hardcoded command string (`"git"`, `"trivy"`, `"gh"`) and a hardcoded/literal args array. No argument is sourced from repository file content. `grep -rn "execa\|runCommand" src/adapters/*remediator*.ts` confirms zero matches — none of the five ecosystem remediators call `execa`/`runCommand`. `traceability.json`'s NFR2.4 target matches. | None — fix confirmed accurate against source. | Resolved |
| R-05 | Resolved | security-design.md > Verification Design table, NFR2.4 row | `test/adapters/ecosystem-remediators.test.ts` is cited alongside `npm-remediator.test.ts` and matches its description as covering Python/Docker/Ruby/Terraform `plan()` output. | None. | Resolved |
| R-06 | Critical | security-design.md > Verification Design table, NFR2.7 row | Re-verified against source this iteration. The row's fix holds up: `src/adapters/ai.ts` exports `AiPolicyGate`, `AiTaskRequest`, `AiTaskPayload`, `AiPlanner`, `AiPolicyError`, `buildAiTaskPayload()`, and `assertAiAllowed()` — reading the file in full confirms `assertAiAllowed` throws `AiPolicyError` when `!policy.enabled` or when the purpose isn't in `policy.allowedPurposes`, and `buildAiTaskPayload` calls `assertAiAllowed` first, then hashes each evidence item's `value` via SHA-256 (`hashValue`) into `valueHash`, omitting the raw `value` from the returned payload entirely, and records `provenance.evidenceHashes`/`findingFingerprint`. `src/index.ts` lines 187-197 re-export `AiPolicyError`, `assertAiAllowed`, `buildAiTaskPayload` (values) and `AiPolicyGate` (type) from `./adapters/ai.js` on the package's public surface, matching the row's claim exactly. Call-site check: `grep -rn "buildAiTaskPayload\|AiPolicyGate\|assertAiAllowed\|adapters/ai" src/ --include=*.ts` outside `ai.ts` itself returns only the three `index.ts` re-export lines — zero hits in `src/application/analyze.ts`, `publish.ts`, `remediate.ts`, `verify.ts`, or `bot.ts`, confirming the gate is exported infrastructure with no current caller, exactly as claimed. `test/adapters/ai.test.ts` was read in full and its three `it()` blocks match the row's description precisely: "blocks AI use when policy is not opted in" (asserts `assertAiAllowed` throws `AiPolicyError` when `enabled: false`), "blocks purposes outside the allow-list" (asserts a throw matching `/not permitted/i` for an unlisted purpose), and "hashes evidence values and never includes raw detector blobs" (asserts the raw evidence string `"super-secret-raw-detector-blob"` is absent from `JSON.stringify(payload)`, `valueHash` matches a 64-hex-char SHA-256 pattern, and `provenance.evidenceHashes` has length 1). `traceability.json`'s NFR2.7 target ("code review of ai.ts's exported-but-uncalled AI policy gate + ai.test.ts") matches the row. The fix is accurate on every checked point. | None — fix confirmed accurate against source. | Resolved |

### Validation Tool Results

No stage-declared validation tools were listed for this stage. This iteration's verification was performed by reading `src/adapters/ai.ts` and `test/adapters/ai.test.ts` in full, by `grep -n "AiPolicyGate|buildAiTaskPayload|assertAiAllowed|AiPolicyError" src/index.ts` to confirm the re-export lines, by `grep -rn "buildAiTaskPayload|AiPolicyGate|assertAiAllowed|adapters/ai" src/ --include=*.ts` to confirm no call sites exist outside `ai.ts`/`index.ts` (specifically none in `analyze.ts`, `publish.ts`, `remediate.ts`, `verify.ts`, `bot.ts`), and by cross-reading `traceability.json`'s NFR2.7 entry against the row. NFR2.1-NFR2.6 were spot-checked against the prior iteration's already-verified findings (R-01 through R-05 above) by re-listing `test/cli/`, `test/action/`, and `.github/workflows/` and confirming no drift from the prior pass's confirmed state.

### Summary

The NFR2.7 fix is accurate: `ai.ts`'s exports, its non-invocation from all four application use-cases, and `ai.test.ts`'s actual assertions all match the row's rewritten claims exactly, and `traceability.json` is consistent. No new drift was found in NFR2.1-NFR2.6. Zero Critical, zero Major findings outstanding — the document is READY.
