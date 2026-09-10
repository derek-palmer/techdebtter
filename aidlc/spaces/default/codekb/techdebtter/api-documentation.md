# API Documentation — TechDebtter

## CLI Surface (Commander, `src/cli/main.ts`)

6 subcommands:

| Command | Purpose | Documentation status |
|---|---|---|
| `analyze <path>` | Run detection + enrichment, produce an analysis report | Documented in README Usage |
| `capabilities [--json]` | Report registered detectors/remediators/ports | Documented in README Usage |
| `publish <report> --select <id...>` | Create GitHub Finding Issues for selected findings | Documented in README Usage |
| `remediate <report> --select <id> [--path] [--base-branch]` | Apply an ecosystem remediation and open a draft PR | Documented in README Usage |
| `observe --owner --repo [--pull] [--head-sha]` | Bot-facing: track PR/Finding state | **Not documented in README's Usage section** — exists in code, exercised by the Action, tested (`test/cli/observe-verify.test.ts`) |
| `verify <report>` | Bot-facing: confirm a remediation and close the Finding Issue | **Not documented in README's Usage section** — same status as `observe` |

All 6 match SPEC I1–I3 plus the bot-facing surface documented in README's "Bot controller" section. Only README's dedicated end-user "Usage" section omits `observe`/`verify` — see `code-quality-assessment.md`.

## GitHub Action Surface (`src/action/main.ts`, `action.yml`)

6 phases via `switch` on `inputs.phase`: `discover`, `analyze`, `publish`, `remediate`, `observe`, `verify`. README's "Bot controller" section describes only 5 phases (it combines `remediate`/`observe` into one "remediate / observe" description); the code implements `observe` as its own distinct phase with its own inputs (`pull-request-number`, `head-sha`) and outputs, separate from `remediate`.

## Library Entry Point (`src/index.ts`)

Re-exports domain types and promise-returning functions (`analyze`, `publish`, and related application use-case functions) for programmatic consumers, per SPEC I4/I5. Consistent with README/SPEC — no documentation gap here.

## Domain Ports (`src/domain/ports.ts`)

7 exported port interfaces — **one more than SPEC I9 and `docs/architecture.md`'s "External ports" section document (both list exactly six)**:

| Port | Purpose | Documented in SPEC I9 / docs/architecture.md? |
|---|---|---|
| `RepositorySource` | Read local Git repository state | Yes |
| `Detector` | Produce raw `Detection`s (implemented today only by Trivy) | Yes |
| `EnrichmentProvider` | Enrich detections (KEV, EPSS) | Yes |
| `GitHubGateway` | Create Issues / pull requests | Yes |
| `FindingVerificationGateway` | List/close Finding Issues; used by `verify`/`observe` flows (`src/application/verify.ts`) | **No — undocumented in SPEC I9 and docs/architecture.md, a docs-vs-code undercount, not a missing capability. Real, used, and tested (`test/application/verify.test.ts`).** |
| `Cache` | Memoize expensive lookups | Yes |
| `Clock` | Testable time source | Yes |

## Agent Skill Wrapper (`skills/techdebtter/SKILL.md`)

Thin conversational wrapper delegating to the CLI. Matches SPEC I10 and README's "Agent skill" section; tested via `test/skills/techdebtter.test.ts`. No documentation gap.

## Report & Policy Schemas

- `schemas/analysis-report.schema.json` — validates the `analyze` output consumed by `publish`/`remediate`/`verify`.
- `schemas/policy.schema.json` — validates `.techdebtter.yml` organization/repository policy files (Ajv2020, `src/domain/policy.ts`), including `productDefaults.detectors` (`allowed`/`required`, both currently `["trivy-vulnerability"]` — see `component-inventory.md` Domain Model & Policy and `code-quality-assessment.md`).
