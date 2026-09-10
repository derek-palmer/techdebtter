# Functional Design — Entities

## Sources

- [scope] `domain-design/components.md` — DependencyWiring's `entities: []` declaration
- `requirements.md` FR1-FR5

## No New Entities This Pass

FR1-FR5 introduce no new entities and modify no existing entity shape.
`DependencyWiring` (the only new component from Domain Design) is pure
construction logic with no owned data (`domain-design/components.md`
`entities: []`). The two existing entities (`Finding`, `Detection`, owned by
`Domain Model & Policy`) are unchanged by this pass's scope.

```yaml
entities: []
```
