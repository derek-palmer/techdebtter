# NFR Requirements — Tech Stack Decisions

## Sources

- `requirements.md` FR1-FR5, NFR2 (no dependency-set change)
- `codekb/techdebtter/technology-stack.md`

## No New Tech Stack Decisions This Pass

`requirements.md` NFR2 explicitly requires no dependency-set change.
FR1-FR5 work entirely within the existing stack (TypeScript ^6.0.3 strict
mode, Node.js >=22, tsup, ESLint/typescript-eslint, Vitest — per
`codekb/techdebtter/technology-stack.md`). FR4.1's DependencyWiring
extraction is a structural refactor within the existing codebase and
introduces no new library, runtime, or tool.
