# Initiative Brief — TechDebtter Verification Pass

## Intent and Problem Statement

Confirm that TechDebtter works as its documentation says it does, and finish
whatever the repository's own information says still needs doing. The
repository already ships a working core (Trivy-based vulnerability analysis,
Finding Issue publication, a remediation gateway, ecosystem remediators, and an
unattended bot controller), so the problem is the gap between what is
documented and what is delivered — not building the product from scratch.
Documented claims not backed by code are triaged individually: build the
capability, correct the claim, or split the difference, decided case by case
with the rationale recorded.

## Market Validation

Not run in this pass — `intent-statement.md` frames this as a proof-of-concept
and personal project, with the maintainer as the sole decision-maker (informed
by input from adopting teams or reviewers) and possible deployment to the
maintainer's work team conditional on it proving useful. Market research was
not selected as a surface to verify in this pass.

## Feasibility and Risk Highlights

Feasibility was not run as its own stage this pass. Its concerns were absorbed
into scope definition and resolved directly during this stage rather than
carried forward as open risk:

| Risk | Status | Evidence |
|------|--------|----------|
| No test baseline in this clone | Resolved | `npm install` succeeded (225 packages); `npx vitest run` — 28 test files, 130 tests, all passing |
| Toolchain (Trivy, GitHub CLI) unconfirmed | Resolved | Trivy 0.74.0 and GitHub CLI 2.86.0 (authenticated as `derek-palmer`) both present; Node 24.14.0 |
| Type safety | Confirmed | `npx tsc --noEmit` — clean |
| Product code quality | Confirmed | `npx eslint src test` — clean |
| Framework scaffold lint | New finding, contained | `npm run check`'s full lint pass reports 95 errors, all inside `.claude/tools/` (the AI-DLC harness itself, not product code) — `eslint.config.js` lacks a top-level `files` scope, so its base rule sets apply repo-wide instead of to `src/`/`test/` only. Recorded as deferred work (does not change a public contract, but is outside `src/`, so it is flagged rather than fixed silently) |
| Fixture repository has no host | Resolved | A new private repository under the maintainer's personal GitHub account |
| Real-work-repository dry run has no named target | Open — deferred | To be decided once the earlier work is done; kept in the backlog as B11 (Could) |
| Fixture's inert placeholder content may go unread | Open — accepted | Anticipates future detection-category work; accepted as a deliberate trade-off in scope definition |

## Scope Boundary

Confirmed as written in `scope-document.md`, no changes requested at this gate:

**In scope**: verify the CLI surface, the GitHub Actions bot controller, the
remediation path, and policy/criticality behaviour; build the fixture
repository; restructure `README.md` and `SPEC.md` around a current-versus-
planned split; repair small contained defects; establish the local toolchain.

**Out of scope**: verifying the agent skill; building detection for debt
categories beyond vulnerabilities; any fix touching a public contract, a
schema, or the dependency set; live GitHub writes to a real work repository;
adopting a declarative LLM-programming framework; numeric quality thresholds
for the three named success measures.

## Concept Visuals

None — no UI surface. This is a CLI and GitHub Action product; rough mockups
were not run as a stage.

## Team Plan

Solo. The maintainer decides scope and priority, informed by input from
adopting teams or reviewers when it becomes available. No mob composition or
Bolt-to-team assignment applies; team formation was not run as a stage.

## Go/No-Go Recommendation

**Go.** Both risks the maintainer flagged for mitigation before Inception —
the missing test baseline and the unconfirmed toolchain — are now resolved
with evidence, not assumption. The scope boundary was reviewed against the
compiled artifacts and confirmed unchanged. Proceed to Inception starting with
Reverse Engineering.

## Assumptions & Open Questions

- [assumption] The real work repository for the follow-on dry run remains
  unnamed; its owner's policy on third-party read-only analysis is
  unestablished until it is chosen.
- [assumption] The 95 framework-scaffold lint errors are pre-existing and
  unrelated to this initiative's work; they were not introduced by anything
  done in Ideation. Fixing `eslint.config.js`'s scoping is deferred work, not
  yet assigned to a specific Bolt.
- [assumption] `npm audit` reported one low-severity vulnerability during
  `npm install`; not investigated in this pass, since dependency-drift
  detection is explicitly the kind of gap this initiative exists to verify
  rather than to pre-empt.
