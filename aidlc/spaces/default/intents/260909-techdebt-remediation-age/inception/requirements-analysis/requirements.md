# Requirements — Requirements Analysis


## Sources

- [scope] `scope-document.md` — S1-S8 in-scope items (verify, correct docs, small contained fixes), change limit (no public contract/schema/dependency-set change), verification boundary (fixture=real writes, real repo=read-only, this repo=tests/static)
- [desc] `intent-statement.md` — Problem Statement, Success Metrics, Initial Scope Signal
- [memory] `codekb/techdebtter/business-overview.md` — Key Documentation Gap finding
- [memory] `codekb/techdebtter/architecture.md` — Improvement Opportunities, port list, wiring duplication
- [memory] `codekb/techdebtter/code-quality-assessment.md` — full documentation-gap register (referenced, not re-quoted here)
- [Q1]-[Q8] `requirements-analysis-questions.md` — this stage's answered questions

## Functional Requirements

### FR1 — Correct README's detection-scope description

**FR1.1**: Rewrite README's opening/top-of-file description to state the single-detector (Trivy vulnerability scanning) scope plainly, matching `SPEC.md` C5, `docs/architecture.md`, and README's own "Project status" section. [Q1][memory:business-overview.md]

**FR1.2**: Move the eight-category language (dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, repetitive code-quality issues) into a clearly labeled roadmap or vision section, distinct from the current-capability description. [Q1]

**FR1.3**: Add README Usage-section documentation for the `observe` and `verify` CLI subcommands, which exist and are tested but currently surface only implicitly via the "Bot controller" phases list. [Q5][memory:code-quality-assessment.md]

### FR2 — Correct the port-list documentation gap

**FR2.1**: Add `FindingVerificationGateway` to `SPEC.md` I9's port list. [Q2][memory:architecture.md]

**FR2.2**: Add `FindingVerificationGateway` to `docs/architecture.md`'s port list, bringing both documents' stated port count from six to the seven ports actually defined in `src/domain/ports.ts`. [Q2][memory:architecture.md]

### FR3 — Resolve the SPEC C10 scheduled smoke-test gap

**FR3.1**: Investigate whether the "live external smoke tests scheduled, non-blocking" workflow described in `SPEC.md` C10 exists outside this repository (e.g., configured directly in GitHub's UI/Settings rather than as a committed `.github/workflows/` file) before deciding whether to build it, correct the claim, or record it as deferred work. [Q3]

**FR3.2**: Based on FR3.1's finding, apply exactly one of: build the missing scheduled workflow (a small contained fix — no contract/schema/dependency-set change), correct `SPEC.md` C10 to remove or reclassify the claim as a future constraint, or record the gap as deferred work with no document change. The chosen disposition and its evidence must be recorded in the stage's `memory.md` diary. [Q3]

### FR4 — Extract shared dependency-wiring factory

**FR4.1**: Extract a shared factory for the adapter-wiring logic currently duplicated independently between `src/cli/bootstrap.ts` and `src/action/main.ts`'s `createAnalyzeDependencies`, removing the duplication `architecture.md` and `code-quality-assessment.md` flag as a contained, low-risk improvement opportunity — without changing either entry point's public contract, the wiring's external behavior, or the dependency set. [Q7][memory:architecture.md][memory:code-structure.md]

### FR5 — Verify each documented surface against SPEC.md invariants

**FR5.1**: Verify the CLI surface (all subcommands, including `observe`/`verify`), the bot-controller surface (discover → analyze → publish → remediate → observe → verify phases), the remediation path (all five ecosystem remediators), and the policy/criticality behavior, exercising both the happy path and every `SPEC.md` invariant (V1-V30) applicable to that surface — including but not limited to the non-reproducible-report rule (V8), the required-CI-observation draft-PR rule (V23), and the policy fallback/override rules (V9-V12). [Q6][scope]

**FR5.2**: Record verification results (pass/fail per invariant checked) in the stage diary or a dedicated verification artifact in a later Inception/Construction stage, so each invariant's verification status is traceable back to this requirement.

## Non-Functional Requirements

### NFR1 — No new coverage gate this pass

Code-coverage tooling and a stated threshold are explicitly deferred; verification success under this intent does not depend on a coverage gate. This is a recorded deferral, not a requirement to configure coverage. [Q4][memory:code-quality-assessment.md]

### NFR2 — Change-limit compliance

All requirements above (FR1-FR4) must be satisfied without changing any public contract, schema, or the project's dependency set, per `scope-document.md`'s change limit. FR5 verification work is read/test-only and does not modify shipped behavior. [scope]

## Assumptions & Open Questions

- FR3.1's investigation may find the scheduled smoke-test workflow was configured outside the repository (e.g., GitHub UI schedule) rather than missing entirely; FR3.2's disposition depends on that finding and is not pre-decided. [assumption]
- None. [Q8 — confirmed nothing further to add beyond FR1-FR5/NFR1-NFR2]

## Traceability

| ID | Origin |
|----|--------|
| FR1.1-FR1.3 | Q1, Q5; `business-overview.md` Key Documentation Gap; `code-quality-assessment.md` |
| FR2.1-FR2.2 | Q2; `architecture.md` Architectural Style, Improvement Opportunities |
| FR3.1-FR3.2 | Q3; `architecture.md` Improvement Opportunities |
| FR4.1 | Q7; `architecture.md` Key Design Decisions, Improvement Opportunities; `code-structure.md` Wiring/composition |
| FR5.1-FR5.2 | Q6; `scope-document.md` S1-S8 verification surfaces |
| NFR1 | Q4; `code-quality-assessment.md` |
| NFR2 | `scope-document.md` change limit |

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-10T01:51:49Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | requirements.md > Functional Requirements / Traceability | `scope-document.md` S5 ("Build the fixture repository") and S8 ("Establish the local toolchain") are named in-scope deliverables with no corresponding FR and no row in the Traceability table. A developer working from requirements.md alone would not know the fixture repo and the Trivy/GitHub-CLI toolchain must exist before FR5's verification work can run. | Add an FR (or an explicit "carried as-is from scope-document.md, no triage needed" note in Traceability) covering S5 and S8 so the document is self-contained, or state explicitly why these are intentionally left as scope-document-only items. | New |
| R-02 | Minor | requirements.md > FR3.1 | FR3.1 is an investigation step with no stated evidence artifact or pass/fail criterion of its own — only FR3.2's resulting disposition is independently testable. Per inception guardrails, every requirement needs a clear pass/fail criterion. | State where/how the investigation's finding is recorded (e.g., "documented in the stage's memory.md before FR3.2 is applied") so FR3.1 is independently checkable, not just implied by FR3.2. | New |
| R-03 | Minor | requirements.md > FR1, FR2, FR3.2 vs. scope-document.md S6 | `scope-document.md` S6 frames documentation work as restructuring README/SPEC around a stated "current-versus-planned split," but requirements.md only carries the three specific point corrections (FR1, FR2, FR3.2) without an umbrella requirement for the broader current-vs-planned framing S6 describes. | Either add a requirement capturing the current-vs-planned split as its own deliverable, or note in Traceability that FR1+FR2+FR3.2 are understood to jointly satisfy S6 in full. | New |
| R-04 | Minor | requirements.md > FR4.1 | FR4.1 requires the wiring extraction not to change "the wiring's external behavior" but does not state how that will be verified (e.g., existing test suite must remain green, or CLI/Action outputs are diffed pre/post-refactor). | Add an explicit verification method for FR4.1's no-behavior-change claim. | New |

### Summary

Requirements are well-grounded — every FR/NFR traces cleanly to an answered question and a specific reverse-engineering or scope finding, the eight Q&A answers map onto the FR/NFR set with nothing dropped or invented, and FR3's investigate-then-decide structure does not presuppose FR3.2's outcome. The main gap is completeness against `scope-document.md`'s full in-scope list (S5 fixture repo, S8 toolchain, and S6's broader documentation-restructuring framing) — these are real prerequisites for FR5 verification and are not currently represented in requirements.md's FR set or Traceability table, though they remain recoverable from scope-document.md directly, which keeps this at Major rather than Critical.
