# Requirements Analysis — Questions

Reverse Engineering confirmed the central finding from Ideation and surfaced
four more concrete documentation-versus-code gaps. `scope-document.md` already
settled the overall shape (verify, correct docs, small contained fixes, no new
capability) — these questions turn that shape into requirement-level decisions
for each specific finding, plus the non-functional targets the requirements
document needs.

## Q1. How should the README detection-scope claim be corrected?

`business-overview.md` confirms: README's top-of-file description claims eight
debt categories; only one detector (`TrivyVulnerabilityDetector`) is
registered. `SPEC.md`, `docs/architecture.md`, and README's own "Project
status" section already agree with the narrower reality — only README's
opening description is overstated.

- A. Rewrite the opening description to state the single-detector scope
  plainly, and move the eight-category language into a clearly labeled roadmap
  or vision section
- B. Rewrite the opening description to state the single-detector scope, and
  remove the eight-category language entirely (no roadmap section)
- C. Keep the eight-category language but add an explicit "currently
  implemented" qualifier next to it
- D. Leave README as-is; this is out of scope for this pass
- X. Other (please specify)

[Answer]: A. Rewrite the opening description to state the single-detector scope plainly, and move the eight-category language into a clearly labeled roadmap or vision section

## Q2. Should `FindingVerificationGateway` be added to SPEC.md and docs/architecture.md's port lists?

`architecture.md` confirms seven ports exist in `src/domain/ports.ts`;
`SPEC.md` I9 and `docs/architecture.md` both currently describe six.

- A. Yes — add it to both documents; this is a documentation correction, not a
  behavior change
- B. Add it to `docs/architecture.md` only; `SPEC.md`'s port count is not worth
  revising this pass
- C. No — leave both as six-port descriptions
- X. Other (please specify)

[Answer]: A. Yes — add it to both documents; this is a documentation correction, not a behavior change

## Q3. What should happen to the SPEC C10 scheduled smoke-test workflow that doesn't exist?

`SPEC.md` C10 describes "live external smoke tests scheduled, non-blocking."
`.github/workflows/` contains only the push/PR-triggered `ci.yml` — no
scheduled workflow exists.

- A. Build it — this is a small contained fix within the change limit
  (`scope-document.md`'s limit excludes anything changing a public contract,
  schema, or the dependency set; a new scheduled CI workflow changes none of
  those)
- B. Correct the claim — remove C10 from `SPEC.md`, or mark it as a future
  constraint rather than a current one
- C. Record as deferred work — leave both the constraint and the gap as-is,
  filed for a later pass
- D. Investigate first — it's possible this exists outside the repository
  (e.g. configured in GitHub's UI rather than in a workflow file); check before
  deciding build vs. correct
- X. Other (please specify)

[Answer]: D. Investigate first — check whether this exists outside the repository before deciding build vs. correct

## Q4. Should a code-coverage threshold be configured?

`code-quality-assessment.md` reports no coverage tooling or threshold
configured in `vitest.config.ts`. `org.md`'s Testing Posture default for this
scope adds an 80% line-coverage floor when a posture has been affirmed for
`classic`-family scopes, but no posture has been affirmed for this composed
scope, and `scope-document.md` set the test-strategy question aside as a later
concern.

- A. Yes, configure it now — add coverage tooling and a stated threshold as
  part of this pass's verification work
- B. Not this pass — record it as deferred work; verification does not require
  a coverage gate to succeed
- C. Measure but don't gate — configure coverage reporting so the number is
  visible, without failing CI on a threshold
- X. Other (please specify)

[Answer]: B. Not this pass — record it as deferred work; verification does not require a coverage gate to succeed

## Q5. Should README's Usage section document the `observe`/`verify` subcommands?

Both subcommands exist, are tested, and work — `code-quality-assessment.md`
confirms they are implemented and only under-documented; this is not a
detection or behavior gap.

- A. Yes — add them to README's Usage section
- B. No — leave them documented only via the "Bot controller" phases list
- X. Other (please specify)

[Answer]: A. Yes — add them to README's Usage section

## Q6. Does verifying each documented surface mean proving the happy path only, or the documented failure/edge behavior too?

`scope-document.md` names the CLI, bot controller, remediation path, and
policy/criticality behaviour as the surfaces to verify. Each carries documented
failure semantics — exit codes 2/3/4/10, the non-reproducible-report rule
(`V8`), the required-CI-observation rule that keeps a failing PR in draft
(`V23`), the policy fallback and override rules (`V9`-`V12`).

- A. Happy path plus every documented failure/edge rule named in `SPEC.md`'s
  invariants (V1-V30) that applies to the selected surfaces
- B. Happy path only — failure and edge behavior is assumed correct unless a
  test already exercises it
- C. Happy path plus a targeted sample of the highest-risk failure rules
  (please note which, if you have specific ones in mind)
- X. Other (please specify)

[Answer]: A. Happy path plus every documented failure/edge rule named in SPEC.md's invariants (V1-V30) that applies to the selected surfaces

## Q7. What does "small contained fix" mean when Reverse Engineering also surfaced positive findings, not just gaps?

`code-quality-assessment.md` notes a small duplication: `src/cli/bootstrap.ts`
and `src/action/main.ts`'s `createAnalyzeDependencies` each wire the same
adapter set independently rather than sharing a factory. This wasn't a
documentation gap — it's a code-quality observation `architecture.md` flags as
an improvement opportunity.

- A. In scope — extracting a shared wiring factory is a small contained fix
  under `scope-document.md`'s limit (no contract, schema, or dependency
  change)
- B. Out of scope — this pass fixes defects verification uncovers, not
  pre-existing code-quality opportunities that don't block anything
  documented
- C. Record it, decide later — note it as a candidate but don't commit either
  way yet
- X. Other (please specify)

[Answer]: A. In scope — extracting a shared wiring factory is a small contained fix under scope-document.md's limit

## Q8. Any other requirement, constraint, or non-functional target this document should carry that isn't already covered by the scope document or the reverse-engineering findings?

- A. None — the six questions above plus what's already settled in
  `scope-document.md` and `intent-statement.md` cover it
- B. Yes (please describe)
- X. Other (please specify)

[Answer]: A. None — the seven questions above plus what's already settled in scope-document.md and intent-statement.md cover it

## Consolidated Summary Confirmation

Requirements Analysis will translate these answers into FR/NFR items: (1)
README rewrite, 8-category claim moved to roadmap section; (2)
FindingVerificationGateway added to SPEC.md I9 + docs/architecture.md port
lists; (3) investigate SPEC C10 scheduled smoke-test existence before
deciding build/correct/defer; (4) no coverage threshold this pass
(deferred); (5) README Usage section documents observe/verify subcommands;
(6) verification covers happy path + every applicable SPEC V1-V30 invariant
on CLI/bot-controller/remediation/policy surfaces; (7) extract shared
adapter-wiring factory (cli/bootstrap.ts + action/main.ts dup) as an
in-scope small fix.

[Answer]: Looks correct
