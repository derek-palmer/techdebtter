# Domain Design — Architecture Decision Records

## ADR-001: Extract adapter wiring into a new `DependencyWiring` component

**Context**

`code-structure.md` and `architecture.md` both identify that `src/cli/bootstrap.ts`
and `src/action/main.ts`'s `createAnalyzeDependencies` each independently
construct and wire the same set of concrete adapters (GitHub Integration,
Detection & Enrichment, Ecosystem Remediator, Infrastructure) into
Application Use-Cases. `architecture.md`'s Improvement Opportunities section
flags this as "a contained, low-risk duplication." `requirements.md` FR4.1
scopes fixing it as an in-scope small contained fix (no contract, schema, or
dependency-set change). A boundary decision was needed for where the
deduplicated logic should live.

**Decision**

Create a new component, `DependencyWiring`, as a distinct logical building
block depended on by both `CLI` and `GitHub Action Controller`. It owns no
entities and performs pure construction logic: given process
environment/config, it returns a fully-wired adapter set ready for injection
into `Application Use-Cases`.

**Consequences**

- Positive: removes the two independent wiring implementations; a future
  third entry point (if one were ever added) reuses the same wiring instead
  of writing a fourth copy.
- Positive: keeps `Domain Model & Policy`'s "no outward dependencies"
  boundary rule intact — wiring is not folded into that layer.
- Positive: keeps `Application Use-Cases`'s dependency-injection pattern
  unchanged — it still receives adapters as parameters; only who constructs
  them moves.
- Negative: introduces one more component to the catalogue for what is, in
  code terms, a small amount of construction logic — a deliberate trade
  against leaving the duplication in place, per Q1's answer.
- No contract, schema, or dependency-set change: `CLI` and `GitHub Action
  Controller`'s public behavior is unchanged; only which file constructs
  their adapters changes. Satisfies `requirements.md` NFR2.

**Alternatives Rejected**

- **Option B — shared module inside `Domain Model & Policy`**: rejected
  because that component is documented as the innermost layer with "no
  outward dependencies," and wiring necessarily constructs adapters — an
  outward dependency. Folding wiring in there would either violate that
  documented invariant or require quietly redefining it, neither of which
  this pass's change-limit allows.
- **Option C — shared module inside `Application Use-Cases`**: rejected
  because `Application Use-Cases` already receives adapters via dependency
  injection (per `code-structure.md`'s "Code Patterns" — constructor/factory
  parameters, not direct adapter imports); folding construction logic into
  the same component that consumes the constructed instances would blur a
  boundary the codebase currently keeps clean, and would make
  `Application Use-Cases` responsible for both orchestration and
  construction — two distinct concerns.

## ADR-002: No other component-boundary changes this pass

**Context**

`requirements.md`'s FR1, FR2, FR3, FR5, and FR6 are documentation
corrections, an investigation, verification work, and proving-ground setup.
None of them add, remove, merge, or split a component as defined in
`component-inventory.md`.

**Decision**

Carry forward all eight existing brownfield components unchanged. Only
`DependencyWiring` (ADR-001) is new.

**Consequences**

- Positive: minimizes churn to `traceability.json` and keeps this stage
  scoped to what `requirements.md` actually requires, per this pass's
  explicit "no new product capability" boundary (`scope-document.md`).
- No negative consequences identified — this is the null-decomposition
  case the stage file (Step 4) explicitly allows for.

**Alternatives Rejected**

None — a single obvious decomposition (add one component, leave the rest
alone) with no meaningful trade-off to evaluate.
