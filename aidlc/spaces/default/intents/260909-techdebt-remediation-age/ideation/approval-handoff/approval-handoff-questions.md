# Initiative Approval & Handoff — Questions

This stage compiles the Ideation artifacts into an initiative brief and asks for
the go/no-go before Inception begins. Several of the stage's reference questions
do not apply to this initiative and are not asked: no market research, rough
mockups, or team formation ran, and the work is solo with no budget or staffing
commitment to confirm. The questions below cover what is genuinely unresolved.

## Q1. Where will the fixture repository live?

`intent-backlog.md` ranks the fixture (B2) as a Must, and `scope-document.md`
records that no host account or organization has been identified. The fixture
receives real writes — issues and draft pull requests — so it needs somewhere it
can be created with those permissions.

- A. A new public repository under the maintainer's personal GitHub account
- B. A new private repository under the maintainer's personal GitHub account
- C. A repository under a GitHub organization the maintainer controls
- D. A local-only repository with no GitHub remote — accepting that the
  publication and remediation write paths cannot then be verified against it
- E. Not yet decided — resolve before the fixture work starts
- X. Other (please specify)

[Answer]: B. A new private repository under the maintainer's personal GitHub account

## Q2. Which real work repository is the read-only dry run against?

`intent-backlog.md` ranks this Could (B11), and `scope-document.md` records the
repository as unnamed, with its owner's policy on third-party analysis
unestablished.

- A. Name it now — the maintainer has a specific repository in mind and can
  confirm that read-only analysis of it is permitted
- B. Decide later — keep B11 in the backlog and pick the repository when the
  earlier work is done
- C. Drop it from this pass — remove the real-repository dry run and rely on the
  fixture alone
- D. Not yet decided
- X. Other (please specify)

[Answer]: B. Decide later

## Q3. Are the carried risks acknowledged, or does any of them need mitigation before Inception?

Three risks carry forward from Ideation: the test suite has never run in this
clone so there is no baseline and the volume of small fixes is unknown; Trivy and
the GitHub CLI are assumed installable but unconfirmed; and the fixture's inert
placeholder content anticipates detection work that may never start.

- A. Acknowledged — proceed, and handle each risk when the work reaches it
- B. Mitigate the baseline risk first — run the existing suite before Inception
  begins, so the scale of the work is known
- C. Mitigate the toolchain risk first — confirm Trivy and the GitHub CLI can be
  installed before committing to the plan
- D. Mitigate both before Inception
- X. Other (please specify)

[Answer]: D. Mitigate both before Inception — done during this stage: Node 24.14.0, Trivy 0.74.0, and GitHub CLI 2.86.0 (authenticated as derek-palmer) are all present; `npm install` succeeded (225 packages); the existing suite now has a first baseline — 28 test files, 130 tests, all passing; `tsc --noEmit` is clean; `eslint src test` is clean. The only failure is 95 lint errors confined to `.claude/tools/` (the AI-DLC framework scaffold, not product code), caused by `eslint.config.js` lacking a top-level `files` scope so its base rule sets apply repo-wide instead of to `src/`/`test/` only.

## Q4. Does the scope boundary still reflect your intent now that it is written down?

`scope-document.md` puts eight items in scope and six out, and ranks remediation
and bot-controller verification as Should rather than Must.

- A. Yes — the boundary as written is correct
- B. Promote remediation and bot-controller verification to Must — automated pull
  requests are the capability that matters most
- C. Add the agent skill to the verified surfaces — it was not selected earlier
- D. Narrow it — something currently in scope should come out (please describe)
- X. Other (please specify)

[Answer]: A. Yes — the boundary as written is correct

## Q5. What is the go/no-go recommendation you want recorded?

The initiative brief carries an explicit recommendation into the approval gate.

- A. Go — proceed to Inception as scoped
- B. Go with conditions — proceed, but record specific conditions that must hold
  (please describe)
- C. No-go — do not proceed; the initiative ends here
- D. Defer — pause the initiative without ending it
- X. Other (please specify)

[Answer]: A. Go — proceed to Inception as scoped

## Consolidated Summary Confirmation

Summary of all answers before artifact generation:

- Fixture repository: a new private repository under the maintainer's personal GitHub account (Q1)
- Real-repository dry run: decided later, once the earlier work is done (Q2)
- Carried risks: both mitigated during this stage — Node 24.14.0, Trivy 0.74.0, and GitHub CLI 2.86.0 (authenticated) confirmed present; `npm install` succeeded; the existing suite ran for the first time in this clone with 28 test files and 130 tests all passing; `tsc --noEmit` is clean; `eslint src test` is clean. A new, contained finding: 95 lint errors exist, but they are confined to `.claude/tools/` (the AI-DLC framework scaffold), not product code, because `eslint.config.js` lacks a top-level `files` scope (Q3)
- Scope boundary: confirmed correct as written (Q4)
- Recommendation: Go — proceed to Inception as scoped (Q5)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
