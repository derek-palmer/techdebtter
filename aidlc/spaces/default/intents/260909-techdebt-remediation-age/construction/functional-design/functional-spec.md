# Functional Design — Functional Specification

## Sources

- `requirements.md` FR4.1
- `domain-design/components.md` — DependencyWiring component
- `domain-design/decisions.md` ADR-001

## Scope

This file covers the only workflow this pass introduces: `DependencyWiring`'s
construction sequence (FR4.1). FR1-FR3 and FR5 have no workflow or state
machine of their own — they are documentation edits, an investigation, and
verification against existing code paths, not new behavior.

## Workflow: DependencyWiring Construction

**Trigger:** `CLI` or `GitHub Action Controller` bootstraps its `analyze`
path (process start).

**Scope correction (post-review, iteration 1):** FR4.1 names one specific
duplication — `src/cli/bootstrap.ts`'s `createDefaultAnalyzeDependencies`
and `src/action/main.ts`'s `createAnalyzeDependencies`, which independently
construct the `AnalyzeDependencies` set (per `src/application/analyze.ts`:
`repositorySource`, `detectors`, `enrichmentProviders`,
`readOrganizationPolicy`, `readRepositoryPolicy`, `clock`) for the
`analyze` transaction. The adversarial review verified against
`src/adapters/remediators.ts` and `src/application/run-remediate.ts` that
ecosystem-remediator construction is already centralized in
`run-remediate.ts`, not duplicated — so it is out of `DependencyWiring`'s
scope. It also verified that the CLI's `createDefaultRemediateDependencies`
hardcodes remediation-policy defaults while the Action's
`runRemediatePhase` reads live organization policy from GitHub — a real,
intentional behavioral divergence for the *remediate* path, not a
duplication to unify.

**Scope correction (post-review, iteration 2):** the analyze-path
narrowing above was itself incomplete. `AnalyzeDependencies`'s
`readOrganizationPolicy` field diverges the same way, inside this scope:
`bootstrap.ts` hardcodes a stub (`async () => ({ state: "unverifiable" })`),
while `action/main.ts` performs a live GitHub read via
`gateway.readOrganizationPolicy`. `readRepositoryPolicy`
(`readRepositoryPolicyFile`) is identical in both and is not divergent.
`DependencyWiring` wires both policy-loading fields but preserves each
entry point's existing `readOrganizationPolicy` behavior unchanged — see
`rules.md` BR1.2.

`DependencyWiring` therefore wires only the `analyze`-path adapter set;
remediate-path wiring stays exactly as it is today, in its current two
forms, in both entry points.

**Steps:**

1. Entry point (`CLI` or `GitHub Action Controller`) calls `DependencyWiring`'s
   construction entry point, passing process environment/config, for the
   `analyze` transaction only.
2. `DependencyWiring` constructs the full `AnalyzeDependencies` set against
   `Domain Model & Policy`'s port interfaces and existing policy-loading
   functions:
   - `RepositorySource` → GitHub Integration Adapters (local Git)
   - `Detector` → Detection & Enrichment Adapters (`TrivyVulnerabilityDetector`)
   - `EnrichmentProvider`s → Detection & Enrichment Adapters (`CisaKevProvider`, `FirstEpssProvider`; each entry point's existing cache root is used unchanged to construct these — CLI: `join(tmpdir(), "techdebtter-cache")`; Action: `/tmp/techdebtter-action-cache` — `DependencyWiring` does not unify or change either path)
   - `readOrganizationPolicy` → preserved per entry point unchanged (CLI's hardcoded `"unverifiable"` stub vs. Action's live GitHub read) — see `rules.md` BR1.2
   - `readRepositoryPolicy` → `readRepositoryPolicyFile`, identical in both entry points today, wired as-is
   - `Clock` → Infrastructure Adapters
3. `DependencyWiring` returns the wired `AnalyzeDependencies` set to the
   calling entry point.
4. Entry point injects the wired set into the `analyze` Application
   Use-Case as constructor/factory parameters (dependency injection —
   unchanged from today's pattern; only the constructor moves).

**Explicitly out of `DependencyWiring`'s scope:** remediate-path wiring
(`createDefaultRemediateDependencies` in `bootstrap.ts`,
`runRemediatePhase`'s wiring in `action/main.ts`) and ecosystem-remediator
construction (`createDefaultRemediators()`, already centralized in
`run-remediate.ts`). Neither is duplicated between the two entry points in
a way FR4.1 names, and the remediate-path pair differs in a genuine policy
decision — see the Business Rule below.

No error branch: construction failures (e.g., missing required
configuration) surface as the same startup failures the current
independent `analyze`-path implementations already produce today — FR4.1
does not change error behavior, only who performs the construction (per
NFR2's no-behavior-change constraint).

**No state machine**: this is a single synchronous construction pass with
no persisted state and no lifecycle beyond process startup.

## Entity-Relationship Diagram

Not applicable — `entities.md` declares no new entities this pass.

## Rules Summary

Not applicable — `rules.md` declares no new business rules this pass.

## Review

**Request Challenge:** review:8b33f727775634bca012e93f76168c71
**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-10T03:56:44Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | functional-spec.md > Workflow: DependencyWiring Construction | The narrowed scope correctly excludes remediate-path/ecosystem-remediator wiring and rules.md's BR1.1 documents that pre-existing divergence. Verified against `src/adapters/remediators.ts` (single call site in `run-remediate.ts`) and `bootstrap.ts`/`action/main.ts`'s remediate-policy construction — the fix is accurate for what it covers. | (none — original finding addressed) | Resolved |
| R-02 | Minor | traceability.json > `coverage` > `FR3.2` | `target` states the `N/A` is provisional pending FR3.1's investigation and covers the "build" disposition case. | (none) | Resolved |
| R-03 | Minor | traceability.json > `coverage` > `FR4.1` | `target` points to `BR1.1`, a real `BRx.y` ID defined in `rules.md`, matching the stage schema. | (none) | Resolved |
| R-04 | Critical | functional-spec.md > Workflow: DependencyWiring Construction, Steps 1-2 | Re-verified against `src/application/analyze.ts` (`AnalyzeDependencies`, lines 24-35), `src/cli/bootstrap.ts` (line 34: `readOrganizationPolicy: async () => ({ state: "unverifiable" })`), and `src/action/main.ts` (lines 316-319: `readOrganizationPolicy: async (organization) => { const layer = await gateway.readOrganizationPolicy(organization); ... }`). Step 2 now lists all six `AnalyzeDependencies` fields, including `readOrganizationPolicy` and `readRepositoryPolicy`, and states the divergence — CLI's hardcoded `"unverifiable"` stub vs. Action's live GitHub read via `gateway.readOrganizationPolicy` — is preserved unchanged, citing `rules.md` BR1.2. `rules.md` BR1.2 independently documents the same divergence with matching field names, function references, and behavior description. Both the code-fact claims and the cross-reference resolve correctly. | (none — resolved) | Resolved |
| R-05 | Minor | functional-spec.md > Workflow: DependencyWiring Construction, Steps 1-2 | `Cache` is no longer listed as a top-level `AnalyzeDependencies` field; Step 2 now folds cache construction into the `EnrichmentProvider` bullet and states each entry point's cache-root path verbatim — CLI: `join(tmpdir(), "techdebtter-cache")` (matches `bootstrap.ts` line 22), Action: `/tmp/techdebtter-action-cache` (matches `action/main.ts` line 306) — and that `DependencyWiring` does not unify or change either path. | (none — resolved) | Resolved |
| R-06 | Minor | traceability.json > `coverage` > `FR4.1` | `target`'s parenthetical previously read "rules.md is otherwise empty by design", which was accurate when only BR1.1 existed but had gone stale once BR1.2 was added. The entry has now been updated to `"BR1.1, BR1.2 (rules.md now holds two rules documenting the pre-existing, unchanged remediate-path and analyze-path policy-source divergences that DependencyWiring must preserve)"`, which correctly names both rule IDs and accurately describes their content — confirmed against `rules.md`'s BR1.1 (remediate-path divergence) and BR1.2 (analyze-path divergence) definitions. | (none — resolved) | Resolved |

### Validation Tool Results

No stage-declared validation tools apply to this stage. This pass re-checked only the single trivial edit to `traceability.json` (the `FR4.1` coverage `target` field) against `rules.md`'s current BR1.1/BR1.2 definitions; `entities.md`, `rules.md`, and `functional-spec.md` are unchanged since the iteration-3 READY verdict and were not re-derived from source in this pass — that adversarial cross-check against `src/application/analyze.ts`, `src/cli/bootstrap.ts`, `src/action/main.ts`, `src/adapters/remediators.ts`, and `src/application/run-remediate.ts` was already completed and recorded across R-01 and R-04 above.

### Summary

The one outstanding item from iteration 3 (Minor R-06 — a stale cross-reference in `traceability.json`'s `FR4.1` coverage target) is now fixed: the field correctly cites both `BR1.1` and `BR1.2` and accurately describes what each documents, matching `rules.md`. No other changes were made to the functional-design artifacts, and no new findings surfaced. All prior Critical and Major findings remain resolved.
