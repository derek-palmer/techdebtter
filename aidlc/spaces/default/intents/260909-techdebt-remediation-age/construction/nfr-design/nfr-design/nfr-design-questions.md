# NFR Design — Questions

`nfr-requirements`'s only substantive artifact was `security-requirements.md`
(NFR2.1-NFR2.7, each with a one-line "Verification approach"). This stage's
job is to design the concrete mechanics of that verification — the missing
HOW layer. Performance/scalability/reliability/observability had no new
targets, so there is no NFR design to do for them.

## Q1. How should security-design.md specify the concrete verification mechanics?

- A. A per-invariant design: test harness location/shape, fixture-repo
  scenario needed (tying to FR6's fixture repository), concrete assertion,
  and pass/fail criterion for each of NFR2.1-NFR2.7 — detailed enough that
  Code Generation can write the actual test without re-deriving the
  approach
- B. A single general verification strategy paragraph, leaving per-invariant
  specifics to Code Generation
- X. Other (please specify)

[Answer]: A. A per-invariant design: test harness location/shape, fixture-repo scenario, concrete assertion, and pass/fail criterion for each of NFR2.1-NFR2.7

## Q2. Should logical-components.md be produced even though no new component/service boundary is introduced by this pass's NFR work?

`domain-design/components.md` already covers the one new component
(DependencyWiring, pure construction logic — no failure-domain or
blast-radius implications since it wires the same adapters the existing
entry points already wired independently).

- A. Produce a minimal logical-components.md stating no new logical
  component/failure-domain/blast-radius consideration exists beyond what
  domain-design/components.md already established, with a pointer to it
  (satisfies the stage's declared produces list without inventing content)
- B. Skip producing logical-components.md
- X. Other (please specify)

[Answer]: A. Produce a minimal logical-components.md pointing to domain-design/components.md, stating no new consideration exists

## Consolidated Summary Confirmation

NFR Design produces security-design.md with a per-invariant verification
mechanics table for NFR2.1-NFR2.7 (test location, fixture-repo scenario,
assertion, pass/fail criterion), a minimal logical-components.md pointing
to domain-design/components.md, and four "no new design needed" artifacts
(performance/scalability/reliability/observability-design.md) since NFR
Requirements found no new targets in those categories. traceability.json
maps NFR2.1-NFR2.7 to their security-design.md entries.

[Answer]: Looks correct
