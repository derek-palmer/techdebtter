# Decision Log — Ideation

Decisions made across Intent Capture, Scope Definition, and Approval & Handoff,
in the order they were made.

## Intent Capture & Framing

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Problem is verification and gap-closure, not new product vision | The repository already ships substantial functionality; the maintainer's own words were "make sure the app actually works as it says it does, and finish anything that needs to be done" |
| D2 | Customer is the maintainer (proof-of-concept), with conditional deployment to their work team | Not a committed adoption target — deployment is conditional on the project proving useful |
| D3 | Success metrics named but thresholds deferred | Coverage, signal quality, and remediation throughput are the right eventual measures; numeric targets wait for a later pass |
| D4 | Proving ground is a throwaway fixture repository first, a real work repository second | Revised mid-stage from "fixture only" after the maintainer noted real work repositories that would genuinely benefit; fixture stays primary for controlled per-category verification |
| D5 | Against a real repository, stay read-only; write findings to a local directory for optional later publication | Keeps verifying and acting on findings as separate deliberate steps |
| D6 | Adopting a declarative LLM-programming framework (DSPy) is out of scope for this pass | Framework selection is a design-stage decision; recorded as a later candidate |

## Scope Definition & Prioritization

| # | Decision | Rationale |
|---|----------|-----------|
| D7 | Minimum viable scope is verification plus documentation correction plus small contained fixes | Matches the intent as stated; excludes building new capability |
| D8 | Verified surfaces: CLI, bot controller, remediation path, policy/criticality; the agent skill is excluded | Named surfaces are what the documentation makes concrete claims about |
| D9 | README-versus-SPEC disagreement resolved by a current-versus-planned split in both documents | SPEC.md C5 deliberately scopes the tracer to vulnerability detection; the README overstates it. Neither document is simply wrong — they need to agree on what "current" means |
| D10 | Fixture repository is built inside this pass, containing detectable content plus inert markers for undetected categories | Keeps the fixture honest about what it can prove today while anticipating category work later |
| D11 | Toolchain installs (project dependencies, Trivy, GitHub CLI) are approved without per-item confirmation | Explicit approval given at scope definition, satisfying SPEC C11's approval requirement |
| D12 | GitHub write paths verified against the fixture only; real repositories stay read-only | Consistent with D5 |
| D13 | Sequencing is dependency-first: toolchain, fixture, analysis, publication, remediation, bot controller, documentation last | Documentation restructure can only be written honestly once verification has established which side of the split each claim belongs on |
| D14 | A fix exceeds this pass when it changes a public contract, a schema, or the dependency set | Sets a concrete, checkable boundary for "small contained fix" |

## Approval & Handoff

| # | Decision | Rationale |
|---|----------|-----------|
| D15 | Fixture repository will be a new private repository under the maintainer's personal GitHub account | Resolves the open host question from scope definition |
| D16 | The real-work-repository dry run target is deferred to a later decision | Not urgent; the fixture and earlier work come first |
| D17 | Both carried risks (test baseline, toolchain availability) are mitigated during this stage rather than carried into Inception | Confirmed feasible immediately rather than assumed; resolved with evidence: 130/130 tests passing, typecheck clean, toolchain present |
| D18 | Scope boundary confirmed unchanged | Reviewed against the compiled artifacts at the gate; no revision requested |
| D19 | Go/no-go recommendation: Go | Both flagged risks resolved with evidence before the recommendation was made |

## Superseded Answers

| Original | Superseded by | Reason |
|----------|---------------|--------|
| Intent Capture Q11 (fixture repository only, no real-repository proving ground) | Intent Capture Q12 (fixture first, real repository as follow-on) | The maintainer raised real work repositories mid-stage as a genuine need, after the original answer was already confirmed |
