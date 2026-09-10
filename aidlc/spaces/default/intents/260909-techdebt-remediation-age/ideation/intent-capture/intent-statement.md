# Intent Statement — TechDebtter

## Problem Statement

The initiative is to confirm that the product works as its documentation says it
does, and to finish whatever the repository's own information says still needs
doing. [Q1]

The product is a technical-debt remediation agent. [desc] [Q1]

The gap between documented capability and delivered capability is the substance
of the problem: documented claims that are not backed by code are triaged
individually, and each one is decided build-or-correct on its own merits with the
rationale recorded. [Q9]

## Target Customer

This is a proof-of-concept and personal project for the maintainer, with possible
deployment to the maintainer's work team if it proves useful. [Q2]

The benefit sought is confidence that the documented behaviour is real, so that
the possible deployment to a work team rests on verified capability rather than
on documentation. [Q1] [Q2]

## Success Metrics

For this pass, success is that every documented capability is proven to work or
is explicitly recorded as unimplemented. Numeric quality targets are set in a
later pass. [Q10]

Three measures were identified as the ones that will eventually matter, and each
carries a deferred threshold rather than a number today: [Q3] [Q10]

| Measure | What it would quantify | Threshold status |
|---------|------------------------|------------------|
| Coverage | Debt categories detected with evidence-verified findings [Q3] | Deferred to a later pass [Q10] |
| Signal quality | Proportion of published findings rejected as noise [Q3] | Deferred to a later pass [Q10] |
| Remediation throughput | Proportion of high-confidence findings reaching a mergeable pull request without human repair [Q3] | Deferred to a later pass [Q10] |

Verification proceeds in two steps, which is what makes "proven to work"
checkable rather than asserted: a separate throwaway fixture repository built to
contain known debt in each category is the primary proving ground for this pass,
and a real work repository is the follow-on validation once the fixture run is
clean. [Q12]

Against a real work repository the run stays read-only toward the target,
writing its findings into a directory that can be published later if wanted, so
acting on those findings is a separate deliberate step rather than a
consequence of verifying. [Q13]

## Initiative Trigger

Product completeness: the documentation promises capabilities the code does not
yet deliver, and closing that gap is the driver for doing this now. [Q4]

## Initial Scope Signal

- **Workflow-selected scope**: `techdebt-remediation-agent` [scope]
- **User-confirmed product boundary**: the workflow-selected scope was confirmed
  as matching the intended product boundary for this pass. [Q8]
- **Explicitly outside this pass**: adopting a declarative LLM-programming
  framework (DSPy) is out of scope for this pass and recorded as a candidate for
  a later one. [Q14]

## Assumptions & Open Questions

- [assumption] The three identified measures (coverage, signal quality,
  remediation throughput) are the right eventual measures of the product's
  value; only their thresholds were deferred, and the measures themselves were
  not separately validated against a stakeholder need. [Q3] [Q10]
- [assumption] Deployment to the maintainer's work team is a possibility
  conditional on the project proving useful, not a committed outcome; the
  interests of adopting engineering teams, security/compliance reviewers, and
  platform/DevOps owners are therefore prospective rather than currently
  active. [Q2] [Q5]
- [assumption] "Whatever the repository's own information says still needs
  doing" is treated as the documented capability gap, because the repository
  carries no other outstanding work items; the specific inventory of gaps is
  established in a later stage, not here. [Q1] [Q9]
- [assumption] The follow-on validation against a real work repository is
  expected to happen after this pass rather than inside it; which repository,
  and when, was not established. [Q12]
- [assumption] The throwaway fixture repository does not exist yet; whether
  building it belongs inside this pass or is a prerequisite completed outside it
  was not established. [Q12]

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-10T00:38:04Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | intent-statement.md > Problem Statement, sentence "The product is a technical-debt remediation agent. [desc] [Q1]" | The stored initial description (`[desc]`) is truncated to the literal string `"TechDebtter:"` — it contains no assertion that the product is a "technical-debt remediation agent." Neither the confirmed Q1 answer (which only states the maintainer's verification goal) supports this characterization. The claim is true in fact (it matches the workflow-selected scope name `techdebt-remediation-agent`), but it is grounded here by a source tag that does not actually contain it, which is exactly the honesty risk this review was asked to check for given the truncated `[desc]`. | Either drop the sentence (it adds nothing the template requires), or re-tag it to `[scope]` with the "workflow-selected" framing the stage rules require for scope-derived claims, rather than leaving it attributed to `[desc]`. | New |

### Summary

The two artifacts are otherwise disciplined: every other substantive claim traces cleanly to a confirmed `[Q<n>]` answer or `[scope]`, unselected options are never turned into exclusions, both `## Assumptions & Open Questions` sections are honestly populated and correctly labelled, and the stakeholder map's prospective/active distinction is well-handled. The one Major finding is a single mislabeled source on an otherwise-true but unsupported sentence — worth a fix, not a blocker.
