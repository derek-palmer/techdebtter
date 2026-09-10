# Domain Design — Questions

Only `requirements.md`'s FR4.1 (extract shared adapter-wiring factory) introduces
a new logical building block. FR1, FR2, FR3, FR5, and FR6 are documentation
corrections, an investigation, verification work, and proving-ground setup —
none add or change a component boundary. `component-inventory.md`'s existing
eight components (CLI, GitHub Action Controller, Library Entry Point, Domain
Model & Policy, Application Use-Cases, GitHub Integration Adapters, Detection &
Enrichment Adapters, Ecosystem Remediator Adapters, Infrastructure Adapters,
Agent Skill Wrapper) are brownfield and stay as-is.

## Q1. Where should the new shared wiring factory live, and what is it called?

`code-structure.md` classifies `src/cli/bootstrap.ts` and `src/action/main.ts`'s
`createAnalyzeDependencies` as "Wiring/composition" — not part of any of the
eight cataloged components, but a cross-cutting concern both the CLI and the
GitHub Action Controller currently duplicate independently.

- A. A new component, `DependencyWiring`, owned by neither CLI nor Action
  Controller — both depend on it. Cleanest boundary: wiring logic is a
  distinct concern from command parsing (CLI) or phase dispatch (Action
  Controller).
- B. A shared module inside `Domain Model & Policy` — no new component; just a
  new file both entry points import. Simpler, but stretches that component's
  "innermost layer, no outward dependencies" boundary rule since wiring
  necessarily constructs adapters.
- C. A shared module inside `Application Use-Cases` — no new component;
  wiring already constructs the adapters Application Use-Cases depends on,
  so this keeps the dependency direction consistent without adding a
  component.
- X. Other (please specify)

[Answer]: A. A new component, DependencyWiring, owned by neither CLI nor Action Controller — both depend on it

## Q2. Does this factory own entities, or is it pure construction logic with no owned data?

- A. Pure construction logic — no entities, no `entities:` block, just a
  `responsibilities` and `behaviour` description. It builds and returns
  adapter instances; it doesn't own domain data.
- X. Other (please specify)

[Answer]: A. Pure construction logic — no entities, no entities: block

## Q3. Anything else about component boundaries or entity ownership this stage should decide, given everything else in scope is documentation/verification work with no new components?

- A. No — a single new wiring component/module (per Q1) covers it; everything
  else stays within the existing eight-component catalogue
- B. Yes (please describe)
- X. Other (please specify)

[Answer]: A. No — a single new wiring component covers it; everything else stays within the existing eight-component catalogue

## Consolidated Summary Confirmation

Domain Design adds exactly one new component: DependencyWiring (pure
construction logic, no entities), owned by neither CLI nor Action
Controller, both depending on it, replacing the duplicated adapter-wiring
in cli/bootstrap.ts and action/main.ts. All 8 existing brownfield
components stay unchanged.

[Answer]: Looks correct
