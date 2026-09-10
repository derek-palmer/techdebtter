# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- When a later answer changes content the human already confirmed, supersede rather than edit: append the new question as a numbered follow-up, mark the superseded answer as superseded, and re-run the consolidated summary and its confirmation receipt before rewriting any artifact. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:intent-capture:01576797d02254862d0ff9a4ecf182b8b6fd49f3c906417f73b962d606e8a34b -->
- In a stage questions file, keep every numbered question section before the consolidated summary and put the single Assumption Confirmation section last, because the confirmed-content digest treats any other visible heading after the summary as invalid. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:intent-capture:2f363bf6e273ed0fa3db57cddec93f627056f8f8bca96f5a7ea94558d7333545 -->
- When a human answers a structured question with substantive free text rather than a listed option, treat it as their final answer and resolve any remaining ambiguity with narrow follow-up questions, instead of re-opening the original question. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:intent-capture:4e47e9b5e9a2b2c0b84c5bb069d846cbcb47ec23bb54bff2f4f0dd4e13029930 -->
- The `aidlc engine review-brief summary` command fails in this build with "aidlc-review-brief.ts does not export main(argv)"; present the consolidated summary directly in chat and still record the summary-confirmation decision and answer receipts. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:intent-capture:81af6031fcc4ea1f0424a3a025accc8a28895cf0ec331bc2a57545d1140137bf -->
- Track outstanding work as GitHub issues rather than as a backlog kept inside the repository's own documents. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:intent-capture:f6913bce0ed95a7d99bf4fa6ff837fca558e07d132f9bf4dce5e5188fc7edba7 -->
- Before writing a stage's questions, read the project's specifications, build scripts, and code surface, so the options name real decisions in this codebase rather than generic prompts. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:scope-definition:85e16805b0c3a022e694ea51219ab8d790f6815e0f2164977216899fc52ed9cc -->
- When two project documents disagree about what the product currently does, treat resolving the disagreement as an explicit decision for the human rather than as a defect to fix silently. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:scope-definition:3f13a90a436f9449d877e484cdd23ae9ab6d85b80c16709935eeb79bf9f49bb7 -->
- Sequence documentation correction after verification work, so a current-versus-planned split can be written from what verification actually established rather than from expectation. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:scope-definition:81df1f5d5d0c3bd245fb365336d3ead529c718653f4bd392e171567b8a17c409 -->
- Treat a stage file's listed questions as reference topics rather than a script, and add the questions a specific pass's boundaries actually require. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:scope-definition:10f1baace379f52670213b063f18180156769c1b293c5f02e8e7259bd524382d -->
- When a human chooses to mitigate a flagged risk before proceeding, run the actual check inline (install, test, typecheck, or equivalent) rather than recording the risk as still-open or deferred. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:approval-handoff:c2573553103d87927c92e8113db638fd5af52b679ad91926f22e8e5841778823 -->
- When dispatching a code scan or similar research agent, hand it the specific open questions carried from prior stages so it verifies them directly rather than independently re-deriving the same finding. (learned 2026-09-10) <!-- cid:260909-techdebt-remediation-age:reverse-engineering:8e8238bb8fca3c0ee9397c791482ee0f2836a9110c009e0043edb843116929f6 -->
