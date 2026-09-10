# Scope Definition & Prioritization — Questions

Context carried in from `intent-statement.md`: this pass confirms the product
works as documented and triages each unbacked documented claim build-or-correct,
with a purpose-built fixture repository as the primary proving ground and a real
work repository as follow-on validation.

Two facts found while preparing these questions, because they shape the answers:

- `SPEC.md` constraint C5 deliberately limits the first tracer to a
  deterministic, local, LLM-free path — Git plus a Trivy vulnerability scan plus
  CISA KEV and FIRST EPSS enrichment. So the README's eight debt categories
  overstate the specification rather than the specification being unmet. The
  documentation disagrees with itself, and that disagreement is the largest
  single triage decision in this pass.
- `node_modules` is absent from this clone, so the test suite has never been run
  here. Verification has a setup cost before it has a result.

## Q1. What is the minimum viable scope that delivers value for this pass?

- A. Documented-claim verification only — prove or record every documented
  capability, change no product behaviour
- B. Verification plus documentation correction — additionally fix the
  documentation wherever it overstates what the code does
- C. Verification plus documentation correction plus small fixes — additionally
  repair defects that verification uncovers, where the repair is small and
  contained
- D. Verification plus building at least one missing capability — additionally
  close a documented capability gap with new implementation
- X. Other (please specify)

[Answer]: C. Verification plus documentation correction plus small fixes

## Q2. Which documented surfaces must be verified in this pass?

Select all that apply. These are the surfaces the repository documents today.

- A. CLI commands — `analyze`, `publish`, `remediate`, `observe`, `verify`,
  `capabilities`, plus documented exit codes and the non-reproducible-report rule
- B. GitHub Actions bot controller — the `discover` / `analyze` / `publish` /
  `verify` phases and their App-token model
- C. Remediation path — the npm remediator, the Python, Docker, Ruby and
  Terraform remediators, the draft-PR budget, and CI observation
- D. Agent skill — the installable `/techdebtter` skill as a wrapper over the CLI
- E. Policy and criticality behaviour — repository and organization policy
  resolution, and the explainable Critical/High/Medium/Low banding
- X. Other (please specify)

[Answer]: A, B, C, E

## Q3. How should the README-versus-specification disagreement be resolved?

The README advertises eight debt categories; `SPEC.md` C5 scopes the tracer to
vulnerability detection only. Both are current documents in the same repository.

- A. Narrow the README to match the specification — describe the eight
  categories as a roadmap rather than as current behaviour
- B. Broaden the specification to match the README — treat the eight categories
  as committed scope and plan the work
- C. Restructure both around a stated current-versus-planned split, so each
  document distinguishes what ships today from what is intended
- D. Defer — record the disagreement and decide after verification shows what
  actually works
- X. Other (please specify)

[Answer]: C. Restructure both around a stated current-versus-planned split

## Q4. Is building the fixture repository inside this pass, or a prerequisite to it?

This was an open assumption carried out of intent capture. The fixture is a
repository containing known debt in each category, used as the controlled
proving ground.

- A. Inside this pass — building the fixture is one of this pass's deliverables
- B. Prerequisite — the fixture is built outside this workflow, and this pass
  assumes it exists
- C. Inside, but minimal — build only the fixture content needed to exercise the
  surfaces selected in Q2, not all eight categories
- D. Not needed — verify against this repository and the existing test fixtures
  instead
- X. Other (please specify)

[Answer]: A. Inside this pass

## Q5. What may be installed or run in this environment to perform verification?

`node_modules` is absent, and the documented prerequisites are Node.js 22 or
newer, the GitHub CLI authenticated for publication, and Trivy on the PATH.
`SPEC.md` C11 states that no executable dependency installs without user
approval.

- A. Everything needed — install project dependencies, and install Trivy and the
  GitHub CLI if missing
- B. Project dependencies only — run `npm install`, but do not install external
  binaries; verify anything needing Trivy or the GitHub CLI by other means
- C. Nothing without asking each time — surface each required install as its own
  decision when verification reaches it
- D. Nothing — verify by reading code and tests, with no execution in this pass
- X. Other (please specify)

[Answer]: A. Everything needed

## Q6. How far should the GitHub write paths be verified?

Publication and remediation write issues and pull requests. Verifying them for
real requires a repository that can receive those writes.

- A. Against the fixture repository only — real writes, but confined to a
  throwaway repository
- B. Fixture repository plus a dry run against a real repository — writes only to
  the fixture; the real repository sees read-only analysis
- C. Test doubles only — verify the write paths through the existing test
  fixtures, with no live GitHub writes at all
- D. Not in this pass — leave the write paths unverified and record them as such
- X. Other (please specify)

[Answer]: B. Fixture repository plus a dry run against a real repository

## Q7. What is the sequencing preference for the work?

- A. Risk-first — verify the surfaces most likely to be broken or most costly if
  wrong before the rest
- B. Dependency-first — establish the toolchain and fixture, then verify from the
  analysis path outward through publication to remediation
- C. Value-first — verify the surfaces you would most want working if you
  deployed to your work team, and treat the rest as follow-on
- D. Breadth-first — touch every documented surface shallowly to find the gaps,
  then go deep only where something is broken
- X. Other (please specify)

[Answer]: B. Dependency-first

## Q8. Are there hard deadlines tied to any capability?

- A. None — this is unscheduled work
- B. Soft target — a rough timeframe exists, but nothing external depends on it
- C. Hard deadline — a specific date or event depends on this work (please
  describe)
- X. Other (please specify)

[Answer]: A. None

## Q9. What debt content should the fixture repository actually contain?

Raised because Q4 chose a full fixture built inside this pass while detection
today finds only vulnerabilities, so eight-category content would sit unread.

- A. All eight categories — build content for every documented category now,
  accepting that most of it goes unread this pass
- B. Only what the detector finds today — vulnerable dependencies across the npm,
  Python, Docker, Ruby and Terraform ecosystems the remediators cover
- C. Detectable now plus inert markers — real vulnerable dependencies the scanner
  finds, plus placeholder content for the other categories so the fixture is
  ready when detection grows
- D. Decide during construction — settle fixture content when the work reaches it
- X. Other (please specify)

[Answer]: C. Detectable now plus inert markers

## Q10. What makes a fix too big for this pass?

Raised because Q1 admitted small contained fixes; this sets the boundary at
which a repair becomes a later pass instead.

- A. Contained to one file or module — anything spanning multiple modules is
  deferred
- B. No new dependency or contract change — fix freely inside the existing
  structure, but anything altering a public contract, a schema, or the dependency
  set is deferred
- C. Roughly half a day of effort — larger items are recorded and deferred
- D. Case by case at the gate — surface each candidate fix and decide then
- X. Other (please specify)

[Answer]: B. No new dependency or contract change

## Consolidated Summary Confirmation

Summary of all answers before artifact generation:

- Minimum viable scope: verification, documentation correction, and small
  contained fixes (Q1)
- Surfaces verified: CLI commands, GitHub Actions bot controller, remediation
  path, and policy/criticality behaviour; the agent skill was not selected (Q2)
- README-versus-specification disagreement resolved by restructuring both
  documents around a stated current-versus-planned split (Q3)
- The fixture repository is built inside this pass (Q4), containing real
  vulnerable dependencies the scanner detects today plus inert placeholder
  content for the categories detection does not yet cover (Q9)
- Installing whatever verification needs is approved, including project
  dependencies and the external Trivy and GitHub CLI binaries (Q5)
- GitHub write paths are verified against the fixture repository with real
  writes, while a real work repository sees read-only analysis only (Q6)
- Sequencing is dependency-first: toolchain and fixture, then analysis,
  publication, and remediation in turn (Q7)
- No deadlines; this is unscheduled work (Q8)
- A fix is too big for this pass when it changes a public contract, a schema, or
  the dependency set; those are recorded and deferred (Q10)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
