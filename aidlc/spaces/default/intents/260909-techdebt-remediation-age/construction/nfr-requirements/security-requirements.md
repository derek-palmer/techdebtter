# NFR Requirements — Security Requirements

## Sources

- `requirements.md` FR5.1 (verify SPEC.md invariants), NFR2 (no behavior change)
- `SPEC.md` invariants V8, V9-V12, V21, V26, V27, V29
- `codekb/techdebtter/technology-stack.md`
- `codekb/techdebtter/architecture.md` (GitHub Integration Adapters, GitHub App auth)

## Scope

No FR in this pass changes TechDebtter's security posture. This document
records the **existing** security-relevant invariants that FR5.1's
verification work checks against — a baseline to verify, not a new target
to design. Each requirement below inherits its ID from the closest
applicable inception NFR and appends a sub-number per the stage schema;
since `requirements.md` declares no dedicated security NFR, these are
grouped under NFR2 (change-limit / no-behavior-change compliance) as the
inception anchor, since verifying-without-changing is exactly what NFR2
requires of security-relevant behavior too.

## Security Requirements

### NFR2.1 — Analysis never mutates the target repository or creates GitHub artifacts

**Statement:** `analyze` is read-only: it must not modify the target
repository's working tree, commit history, or create any GitHub-side
artifact (issue, PR, comment).

**Source:** `SPEC.md` V7.

**Verification approach (FR5.1):** exercise `analyze` against the fixture
repository (FR6, if built) or a scratch clone; assert no working-tree diff
and no GitHub API write calls occur during the transaction.

### NFR2.2 — Dirty-worktree rejection and non-reproducible-report marking

**Statement:** A dirty worktree is rejected by default; `--include-uncommitted`
produces a report explicitly marked non-reproducible and unpublishable.

**Source:** `SPEC.md` V8.

**Verification approach (FR5.1):** run `analyze` against a repo with
uncommitted changes, with and without `--include-uncommitted`; assert the
default-case rejection and the flagged-case report's non-reproducible
marker, and assert `publish` refuses a non-reproducible report.

### NFR2.3 — Policy authority chain and override audit

**Statement:** Policy resolves as product defaults → Organization Policy →
Repository Policy within organization ceilings; present-but-invalid policy
halts the operation; confirmed-absent policy falls back to defaults;
unverifiable organization policy blocks publication/remediation; only an
explicit, audited, single-operation human override may exceed policy, and
the bot itself can never grant an override.

**Source:** `SPEC.md` V9, V10, V12.

**Verification approach (FR5.1):** exercise policy resolution with each of
present-valid / present-invalid / confirmed-absent / unverifiable
organization policy; assert the corresponding halt/fallback/block
behavior; exercise a human override and assert it is recorded as audited
and single-operation.

### NFR2.4 — Bot execution boundary

**Statement:** The bot never executes target-repository code; any local
execution TechDebtter performs requires a displayed command and explicit
human approval.

**Source:** `SPEC.md` V21.

**Verification approach (FR5.1):** review the remediate/verify code paths
for any implicit execution of repository-provided scripts; confirm all
subprocess execution is limited to TechDebtter's own tooling (Trivy, Git,
package manager commands the remediator explicitly constructs) and not
arbitrary repository content.

### NFR2.5 — Write-token isolation during analysis

**Statement:** The GitHub write token is never exposed to the Detector or
to target-repository contents during analysis.

**Source:** `SPEC.md` V26.

**Verification approach (FR5.1):** inspect `DependencyWiring`'s (FR4.1)
construction of the `analyze`-path adapter set to confirm no write-scoped
credential is passed to `Detector`/`EnrichmentProvider` construction or
made reachable from analyzed repository content; confirm this is
unaffected by FR4.1's extraction (per `functional-spec.md`'s no-behavior-change
constraint).

### NFR2.6 — Supply-chain pinning for external Actions

**Statement:** External GitHub Actions used in this repository's own
workflows are pinned to reviewed, full commit SHAs.

**Source:** `SPEC.md` V27; `technology-stack.md` CI/CD section confirms
`actions/checkout`/`actions/setup-node` are SHA-pinned in `ci.yml`.

**Verification approach (FR5.1):** confirm via `.github/workflows/ci.yml`
inspection that every external Action reference uses a full commit SHA,
not a tag or branch; this check also informs FR3's C10 investigation
(same workflows directory).

### NFR2.7 — AI-use opt-in gate

**Statement:** Any AI use requires an explicit policy opt-in, minimum
redacted Evidence, a named purpose, and recorded provenance.

**Source:** `SPEC.md` V29.

**Verification approach (FR5.1):** confirm no AI-in-the-loop code path is
reachable without the documented policy opt-in; this pass's own tracer
scope (per `business-overview.md`) confirms no LLM-in-the-loop detection
or remediation exists today, so this invariant is currently satisfied by
absence — verification confirms that remains true.

## Compliance Considerations

None named in this pass's scope; `scope-document.md` records no regulatory
or compliance-framework requirement for this intent.

## Threat Considerations

Out of scope for this pass: no new attack surface is introduced by FR1-FR5
(documentation corrections, an investigation, a pure-construction-logic
extraction verified not to change external behavior, and verification of
existing invariants). A full threat model was not commissioned for this
verify-and-fix pass.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-10T04:08:08Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | security-requirements.md > NFR2.1-NFR2.7 sourcing | Verified all nine cited `SPEC.md` invariants (V7, V8, V9, V10, V12, V21, V26, V27, V29) directly against `SPEC.md` §V. Each requirement's Statement is an accurate restatement of its cited invariant(s), with no drift or overstatement (e.g. NFR2.3 correctly folds V9/V10/V12 into one requirement rather than splitting or conflating them). No correction needed. | (none) | New |
| R-02 | Minor | security-requirements.md > NFR2.5 | Verified NFR2.5's claim against `functional-design/functional-spec.md` and `rules.md`: `DependencyWiring` (FR4.1, narrowed to the analyze-path adapter set) never constructs or captures a GitHub write token — the CLI's analyze path uses a hardcoded `readOrganizationPolicy` stub with no gateway/token at all (`bootstrap.ts` line 34), and the Action's analyze path (`action/main.ts` `createAnalyzeDependencies`) is built from a gateway minted with `permissionsForPhase("analyze")`, which grants only `metadata: read, contents: read` — no write scope (`src/adapters/github-app-auth.ts`). The gateway closure is captured only by `readOrganizationPolicy`, never passed to `Detector`/`EnrichmentProvider` construction. NFR2.5's claim holds against source, not just against the (already-reviewed) functional-design prose. | (none) | New |
| R-03 | Minor | security-requirements.md > NFR2.6 | Verified against `.github/workflows/ci.yml`: both `actions/checkout` and `actions/setup-node` are pinned to full commit SHAs (`fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09`, `a0853c24544627f65ddf259abe73b1d18a591444`), confirming the claim. | (none) | New |
| R-04 | Minor | security-requirements.md > Scope (NFR2.x anchoring) | Anchoring these security requirements under inception `NFR2` (rather than an unanchored/new `NFR3`) is a reasonable, explicitly-justified adaptation: `requirements.md` has no dedicated security NFR, and NFR2 ("no public contract/schema/behavior change... FR5 verification work is read/test-only") is the closest fit for "verify existing security invariants without changing them." `traceability.json`'s NFR2 coverage row lists all seven NFR2.x IDs and matches the file's actual heading set exactly. This does not strain the traceability sensor in a way that blocks readiness, though a future pass introducing a *new* security target (rather than verifying an existing one) should not continue overloading NFR2. | Consider recording a dedicated security NFR ID in a later inception pass if genuinely new security requirements are ever introduced, so NFR2 does not become an unbounded catch-all. | New |
| R-05 | Minor | performance-requirements.md, scalability-requirements.md, reliability-requirements.md, observability-requirements.md, tech-stack-decisions.md | Checked each "no new targets" claim against FR1-FR5: FR1-FR3 are documentation/investigation, FR4.1 is a verified no-behavior-change extraction, FR5 is read/test-only verification, and NFR2 requires no dependency-set change — all five claims hold. One edge case: FR3.2's disposition is not yet decided (`requirements.md`'s own Assumptions note this), and one of its three possible dispositions is "build the missing scheduled smoke-test workflow" (`SPEC.md` C10). Building that workflow would be new CI/observability surface, but since FR3.2 is unresolved as of this stage and none of the five "no new targets" documents flag this contingency, a future pass should re-check these documents once FR3.2's disposition is known rather than assuming the "no new targets" claim automatically continues to hold. | Add a one-line forward-note in reliability-requirements.md and/or observability-requirements.md flagging that FR3.2's disposition (if "build") should be re-checked against these documents. | New |
| R-06 | Minor | traceability.json > NFR1 | The `N/A` justification for NFR1 ("no coverage gate this pass; not a performance/security/scalability/reliability/observability target") is a reasonable and accurate paraphrase of `requirements.md`'s NFR1, which is an explicit deferral, not a requirement. | (none) | New |

### Validation Tool Results

No stage-declared validation tools were listed for this stage; verification was performed by direct comparison against `SPEC.md`, `functional-design/functional-spec.md`, `rules.md`, `requirements.md`, and the actual source files (`src/action/main.ts`, `src/cli/bootstrap.ts`, `src/adapters/github-app-auth.ts`, `.github/workflows/ci.yml`).

### Summary

Every checked claim in `security-requirements.md` holds up against the actual `SPEC.md` text, the functional-design artifacts, and the running source code — the SPEC.md citations are accurate, the NFR2.5 write-token-isolation claim is correct down to the per-phase GitHub App permission scoping, and the SHA-pinning claim matches `ci.yml` verbatim. The NFR2 anchoring choice is a defensible adaptation to a requirements.md gap, not an abuse of the traceability schema. No Critical or Major findings; the Minor findings are forward-looking hygiene notes (FR3.2 contingency, anchoring durability) rather than defects in this pass's work.
