# Code Structure — TechDebtter

## Top-Level Layout

```
src/
  index.ts              # Library Entry Point
  domain/                # Domain Model & Policy
  application/           # Application Use-Cases
  adapters/               # GitHub Integration / Detection & Enrichment / Ecosystem Remediator / Infrastructure Adapters
  cli/                    # CLI
  action/                 # GitHub Action Controller
skills/techdebtter/        # Agent Skill Wrapper
schemas/                   # JSON Schemas (analysis-report, policy)
templates/                 # controller-workflow.yml (reference Action workflow)
test/                      # mirrors src/ 1:1, plus fixtures/
docs/                      # architecture.md, implementation-plan.md, adr/, agents/
.github/workflows/ci.yml   # CI pipeline
```

Component ownership of each `src/` subdirectory is defined in `component-inventory.md`; this file covers organization and file-classification detail not repeated there.

## Module Organization Pattern

Strict layering, inward-pointing dependencies (hexagonal): `cli/` and `action/` → `application/` → `domain/`, with `adapters/` implementing `domain/ports.ts` interfaces and depended upon only by `application/` (via dependency injection at the entry-point wiring stage — `cli/bootstrap.ts` and `action/main.ts`'s `createAnalyzeDependencies`). `domain/` has no outward dependencies on `application/` or `adapters/`.

## File Classification

- **Entry points**: `src/index.ts`, `src/cli/main.ts`, `src/action/main.ts` — the three `tsup` build targets.
- **Wiring/composition**: `src/cli/bootstrap.ts`, `src/action/main.ts`'s `createAnalyzeDependencies` — construct concrete adapter instances and inject them into application use-cases. Not shared between CLI and Action (see `architecture.md` Key Design Decisions).
- **Domain types & rules**: `src/domain/model.ts` (types), `criticality.ts` and `triage.ts` (scoring rules), `fingerprint.ts` (de-duplication), `policy.ts`/`policy-error.ts` (Ajv-validated policy loading against `schemas/policy.schema.json`), `remediation.ts` (remediation domain rules).
- **Port contracts**: `src/domain/ports.ts` — 7 interfaces; see `api-documentation.md`.
- **Application orchestration**: `src/application/analyze.ts`, `publish.ts`, `remediate.ts`, `verify.ts`, `bot.ts`, `run-remediate.ts`, `unattended-select.ts`, plus `report-hash.ts`/`report-schema.ts`/`publish-error.ts`/`remediation-error.ts` for report integrity and error typing.
- **Adapters**: one file per external system, named `<system>.ts` or `<system>-remediator.ts` (e.g. `trivy.ts`, `kev.ts`, `epss.ts`, `github.ts`, `npm-remediator.ts`); `remediator-helpers.ts` and `remediators.ts` provide shared remediator scaffolding and the default-remediator registry.
- **CLI presentation**: `src/cli/render.ts` (output formatting), `src/cli/exit-codes.ts` (process exit-code contract).
- **Tests**: `test/` mirrors `src/` 1:1 by directory (28 `*.test.ts` files); `test/fixtures/` holds representative sample payloads (Trivy, KEV, EPSS, GitHub issues, npm lockfiles, policy YAML, report v1).

## Code Patterns

- **Dependency injection via constructor/factory parameters**: application use-cases receive port implementations as arguments rather than importing adapters directly — enables the CLI's test-friendly deferred bootstrap (`import.meta.url === entryPath` gate in `cli/main.ts`).
- **Schema-validated boundaries**: both the analysis report (`schemas/analysis-report.schema.json`) and policy files (`schemas/policy.schema.json`) are Ajv2020-validated at the boundary, not trusted implicitly.
- **Strict typing, no escape hatches**: `tsconfig.json` enables `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`; no `any`/`as any` found anywhere in `src/` (see `code-quality-assessment.md`).
- **Ecosystem remediator symmetry**: all five ecosystem remediators (npm/Python/Docker/Ruby/Terraform) share a common shape via `remediator-helpers.ts`, registered together in `remediators.ts`'s `createDefaultRemediators()`.
