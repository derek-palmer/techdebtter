# NFR Design — Logical Components

## Sources

- `inception/domain-design/components.md`

## No New Logical Components This Pass

`domain-design/components.md` already establishes the one new component
this pass introduces, `DependencyWiring` — pure construction logic with no
failure domain, no blast-radius change (it wires exactly the adapters the
CLI and GitHub Action Controller already independently wired; see
`functional-design/functional-spec.md` for the post-review-narrowed
scope), and no shared-resource change. All eight brownfield components
carry forward unchanged. There is no new service boundary, isolation
strategy, or shared-resource identification to add beyond what
`domain-design/components.md` already records.
