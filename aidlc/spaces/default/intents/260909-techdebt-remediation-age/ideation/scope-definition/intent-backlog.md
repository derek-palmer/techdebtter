# Intent Backlog — TechDebtter Verification Pass

Proto-Units derived from the scope boundary in `scope-document.md`, which in turn
follows the initiative framed in `intent-statement.md`. Prioritized with MoSCoW
against this pass's purpose: proving documented capability, correcting overstated
documentation, and repairing small contained defects.

Ordering is dependency-first, so the MoSCoW rank and the sequence position are
not the same thing — B1 is ranked Must and runs first because everything else
needs it, while B7 is also Must but runs last because it depends on what the
others find.

## Backlog

| ID | Proto-Unit | Priority | Depends on | Delivers |
|----|-----------|----------|------------|----------|
| B1 | Local toolchain and baseline | Must | — | Project dependencies installed, Trivy and GitHub CLI available and authenticated, the existing test suite executed for the first time in this clone and its result recorded as the baseline |
| B2 | Fixture repository | Must | B1 | A throwaway repository carrying real vulnerable dependencies across the npm, Python, Docker, Ruby and Terraform ecosystems, plus inert placeholder content for the categories detection does not yet cover |
| B3 | Analysis path verification | Must | B1, B2 | Evidence that `analyze` produces a valid versioned report against the fixture, that the dirty-worktree and non-reproducible-report rules hold, and that documented exit codes behave as written |
| B4 | Policy and criticality verification | Must | B3 | Evidence that repository and organization policy resolve in the documented order and that criticality bands are explainable, including the KEV and EPSS rules |
| B5 | Publication path verification | Must | B3 | Evidence that Finding Issues are created, reconciled idempotently, and closed only under the documented verification rule — real writes, confined to the fixture |
| B6 | Remediation path verification | Should | B5 | Evidence that the static remediators produce correct edits, that the draft-PR budget holds, and that required-CI observation keeps a failing PR in draft |
| B7 | Bot controller verification | Should | B5 | Evidence that the Action's discover, analyze, publish and verify phases run with per-phase App tokens as documented |
| B8 | Documentation restructure | Must | B3, B4, B5, B6, B7 | `README.md` and `SPEC.md` rewritten around a stated current-versus-planned split, informed by what verification actually established |
| B9 | Small contained fixes | Should | B3 onward | Defects found during verification, repaired within the change limit — no public contract, schema, or dependency-set changes |
| B10 | Deferred-work record | Must | B3 onward | Every defect and gap that exceeds the change limit, captured as GitHub issues rather than as a backlog inside the repository's own documents |
| B11 | Real-repository read-only dry run | Could | B3, B4 | Analysis run against a real work repository with findings written locally, demonstrating the tool on genuine debt without writing to that repository |
| B12 | Agent skill verification | Won't (this pass) | — | Verification of the installable `/techdebtter` skill; not selected among this pass's surfaces and available to add at an approval gate |
| B13 | Debt-category detection beyond vulnerabilities | Won't (this pass) | — | Implementation of the documented categories the scanner does not cover; this pass resolves the documentation disagreement instead, and B2's inert markers make the fixture ready for the work later |

## Priority Rationale

**Must** covers everything the pass's purpose depends on: the toolchain that
makes verification possible at all (B1), the fixture that gives it a subject
(B2), the analysis, policy, and publication paths that constitute the product's
core claim (B3, B4, B5), the documentation correction that is half the stated
problem (B8), and the deferred-work record that keeps what this pass cannot
absorb from being lost (B10).

**Should** covers real value that is not load-bearing for the pass's success
criteria: the remediation and bot-controller surfaces (B6, B7) are documented and
selected for verification, but a pass that established the analysis and
publication paths and honestly recorded the rest would still have met its
purpose. Small contained fixes (B9) are opportunistic by nature.

**Could** is the real-repository dry run (B11), which demonstrates value on
genuine debt but proves nothing about the product that the fixture cannot.

**Won't (this pass)** records the two explicit exclusions so they are visible
rather than forgotten (B12, B13).

## Value Stream

The stream from capability to outcome runs: a repository is analysed, findings
are triaged and prioritized, selected findings become issues, high-confidence
findings become reviewable pull requests, and merged fixes are verified as
genuinely absent on rescan.

This pass exercises that stream against the fixture rather than extending it. Its
customer outcome is confidence: the maintainer ends the pass knowing which parts
of the stream work, which do not, and which were never built — which is the
precondition for the possible work-team deployment that `intent-statement.md`
names as the conditional next step.

## Assumptions & Open Questions

- [assumption] B6 and B7 are ranked Should on the judgement that analysis and
  publication carry the product's core claim; if the maintainer's interest is
  primarily in automated pull requests, remediation would rank Must instead.
- [assumption] B1's baseline assumes the existing test suite passes; if it does
  not, the failures become verification findings and B9's volume grows in a way
  this backlog has not sized.
- [assumption] B10 assumes deferred work is recorded as GitHub issues, following
  the practice affirmed during this workflow; no issue template or labelling
  convention has been established for it.
- [assumption] B11 is ranked Could on the basis that it demonstrates rather than
  proves; if the work-team deployment decision becomes urgent, its value rises.
