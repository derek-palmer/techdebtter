# Scope Document — TechDebtter Verification Pass

## Purpose

This pass confirms that TechDebtter does what its documentation says it does,
corrects the documentation where it overstates the code, and repairs small
contained defects that verification uncovers. It follows directly from
`intent-statement.md`, which frames the initiative as closing the gap between
documented and delivered capability, triaging each unbacked claim
build-or-correct on its own merits.

## Scope Boundary

### In scope

| # | Item | Detail |
|---|------|--------|
| S1 | Verify the CLI surface | `analyze`, `publish`, `remediate`, `observe`, `verify`, `capabilities`, the documented exit codes, and the rule that a non-reproducible report cannot be published |
| S2 | Verify the GitHub Actions bot controller | The `discover`, `analyze`, `publish`, and `verify` phases and their per-phase App-token model |
| S3 | Verify the remediation path | The npm remediator, the Python, Docker, Ruby and Terraform remediators, the draft-PR budget, and required-CI observation |
| S4 | Verify policy and criticality behaviour | Repository and organization policy resolution, and the explainable Critical/High/Medium/Low banding |
| S5 | Build the fixture repository | A throwaway repository holding real vulnerable dependencies the scanner detects today, plus inert placeholder content for the categories detection does not yet cover |
| S6 | Restructure the documentation | Rework `README.md` and `SPEC.md` around a stated current-versus-planned split, so each distinguishes what ships today from what is intended |
| S7 | Repair small contained defects | Fix what verification uncovers, within the change limit below |
| S8 | Establish the local toolchain | Install project dependencies and the external Trivy and GitHub CLI binaries needed to run the documented paths |

### Out of scope

| # | Item | Why |
|---|------|-----|
| O1 | Verifying the installable `/techdebtter` agent skill | Not selected among the surfaces to verify for this pass; it can be added at an approval gate |
| O2 | Building detection for the debt categories beyond vulnerabilities | This pass resolves the documentation disagreement rather than implementing the missing categories; the fixture carries inert markers so the work is ready to start later |
| O3 | Any fix that changes a public contract, a schema, or the dependency set | Beyond the change limit for this pass; recorded and deferred |
| O4 | Live GitHub writes to a real work repository | Real repositories receive read-only analysis only; every write lands in the fixture |
| O5 | Adopting a declarative LLM-programming framework | Recorded in `intent-statement.md` as out of scope for this pass and a candidate for a later one |
| O6 | Numeric quality thresholds for coverage, signal quality, and remediation throughput | `intent-statement.md` defers these to a later pass; this pass succeeds on proven-or-recorded capability |

### Change limit

A repair belongs to this pass when it fits inside the existing structure. A
repair leaves this pass, and is recorded as deferred work, when it would change
a public contract, a schema, or the dependency set.

## Verification Boundary

| Target | What it receives |
|--------|------------------|
| Fixture repository | Real writes — issues, draft pull requests, and the full remediation path |
| A real work repository | Read-only analysis, with findings written locally so acting on them stays a separate deliberate step |
| This repository | Test-suite execution and static inspection |

This split preserves the `intent-statement.md` position that verifying and
acting on findings are separate decisions, and it satisfies the specification's
requirement that no executable dependency installs without approval — the
approval for the toolchain installs was given explicitly during this stage.

## Sequencing

Sequencing is dependency-first. Each step establishes what the next one needs:

1. **Toolchain** — install project dependencies, Trivy, and the GitHub CLI; get
   the existing test suite running, which has never been executed in this clone
2. **Fixture** — build the throwaway repository with detectable vulnerable
   dependencies and inert markers for the other categories
3. **Analysis** — verify the read-only path end to end against the fixture,
   including policy resolution and criticality banding
4. **Publication** — verify Finding Issue creation, idempotent reconciliation,
   and the closure/verification behaviour
5. **Remediation** — verify the static remediators, the draft-PR budget, and
   required-CI observation
6. **Bot controller** — verify the Action phases and the App-token model
7. **Documentation** — restructure `README.md` and `SPEC.md` around the
   current-versus-planned split, informed by everything the preceding steps
   proved or disproved

Documentation is last deliberately: the split can only be written honestly once
verification has established which side of it each claim belongs on.

## Success Criteria

This pass is complete when every capability named in S1 through S4 has been
either demonstrated working or explicitly recorded as unimplemented, the fixture
in S5 exists and exercises the detectable path, the documentation in S6 states
the current-versus-planned split, and every defect found is either fixed within
the change limit or recorded as deferred work.

Per `intent-statement.md`, the coverage, signal-quality, and remediation-
throughput measures carry deferred thresholds and are not gating criteria here.

## Assumptions & Open Questions

- [assumption] Trivy and the GitHub CLI can be installed and authenticated in
  this environment; neither has been confirmed present.
- [assumption] The fixture repository can be created under an account or
  organization the maintainer controls, with permission to receive issues and
  pull requests.
- [assumption] The inert placeholder content in the fixture is judged useful
  ahead of the detection work it anticipates; if the category work never starts,
  that content stays unread.
- [assumption] The real work repository used for the read-only dry run is
  unnamed, so whether analysis of it is permitted under its owner's policies is
  unestablished.
- [assumption] "Small contained fix" is bounded by the contract/schema/dependency
  rule above, but the volume of such fixes is unknown until verification runs;
  a large number of individually small fixes could still exceed what this pass
  can absorb.
