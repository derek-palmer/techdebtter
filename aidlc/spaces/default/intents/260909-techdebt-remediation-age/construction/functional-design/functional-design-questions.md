# Functional Design — Questions

No `unit-of-work.md` exists (Units Generation was skipped in the composed
scope for this verify-and-fix pass; confirmed with the human before this
stage began). Working directly from `requirements.md` FR1-FR5 and
`domain-design/components.md`.

Scanning FR1-FR5 against this stage's own condition ("new data models,
complex business logic, or business rules need design; skip for simple
logic changes with no new business logic"): only FR4.1 (extract
`DependencyWiring`) has any design content, and `components.md` already
established it is pure construction logic — no entities, no business
rules. FR1-FR3 are documentation/investigation; FR5 is verification of
*existing* SPEC.md invariants, not new rules.

## Q1. Given no new entities or business rules exist this pass, should Functional Design still produce a workflow-level functional-spec.md for FR4.1's DependencyWiring construction sequence, or skip artifact generation entirely and record why?

- A. Produce a lean functional-spec.md documenting only the DependencyWiring
  construction workflow (the one piece of design content that exists),
  with entities.md/rules.md stating explicitly "no new entities/rules this
  pass" rather than being omitted (keeps the stage's declared `produces`
  list satisfied for sensor/traceability purposes)
- B. Skip artifact generation for this stage entirely and record in the
  stage diary that the condition wasn't met
- X. Other (please specify)

[Answer]: A. Produce a lean functional-spec.md documenting only the DependencyWiring construction workflow, with entities.md/rules.md stating explicitly no new entities/rules this pass

## Consolidated Summary Confirmation

Functional Design produces four lean artifacts: entities.md and rules.md
each explicitly state no new entities/business rules this pass (FR1-FR5
introduce none); functional-spec.md documents only the DependencyWiring
construction workflow (FR4.1); traceability.json maps FR4.1 to that
workflow and notes FR1/FR2/FR3/FR5 as out of this stage's scope (no
business logic to trace).

[Answer]: Looks correct
