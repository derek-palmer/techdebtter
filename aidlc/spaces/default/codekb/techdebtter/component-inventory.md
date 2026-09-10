# Component Inventory — TechDebtter

Component names in this file are authoritative for this codekb store; `architecture.md` and the `reverse-engineering-timestamp.md` Scope of Analysis block reference these headings verbatim.

## CLI

- **Location**: `src/cli/main.ts`, `src/cli/bootstrap.ts`, `src/cli/exit-codes.ts`, `src/cli/render.ts`
- **Responsibility**: Commander-based command-line entry point exposing 6 subcommands (`analyze`, `capabilities`, `publish`, `remediate`, `observe`, `verify`). `bootstrap.ts` wires default (real) adapters and is dynamically imported only when the module is run as the entry point, keeping `main.ts` testable without live adapters.
- **Depends on**: Application Use-Cases, Domain Model & Policy, Infrastructure Adapters, GitHub Integration Adapters, Detection & Enrichment Adapters.

## GitHub Action Controller

- **Location**: `src/action/main.ts`, `action.yml`, `templates/controller-workflow.yml`
- **Responsibility**: GitHub Action entry point exposing 6 phases via a `switch` on `inputs.phase`: `discover`, `analyze`, `publish`, `remediate`, `observe`, `verify`. Wires its own dependency set (`createAnalyzeDependencies`) independently of the CLI's `bootstrap.ts` — a known, low-risk duplication (see `code-quality-assessment.md`).
- **Depends on**: Application Use-Cases, Domain Model & Policy, Infrastructure Adapters, GitHub Integration Adapters, Detection & Enrichment Adapters.

## Library Entry Point

- **Location**: `src/index.ts`
- **Responsibility**: Re-exports domain types and promise-returning functions (`analyze`, `publish`, etc.) for programmatic consumers embedding TechDebtter in their own tooling.
- **Depends on**: Application Use-Cases, Domain Model & Policy.

## Domain Model & Policy

- **Location**: `src/domain/model.ts`, `src/domain/ports.ts`, `src/domain/criticality.ts`, `src/domain/fingerprint.ts`, `src/domain/policy.ts`, `src/domain/policy-error.ts`, `src/domain/remediation.ts`, `src/domain/triage.ts`
- **Responsibility**: Core domain types (`Finding`, `Detection`, etc.), the 7 external port interfaces (see `api-documentation.md`), criticality/triage scoring rules, finding fingerprinting for de-duplication, and policy loading/validation (Ajv against `schemas/policy.schema.json`) including `productDefaults.detectors` — the source of truth confirming only `trivy-vulnerability` is a registered detector.
- **Depends on**: none (innermost layer; depended on by every other component).

## Application Use-Cases

- **Location**: `src/application/analyze.ts`, `bot.ts`, `publish.ts`, `publish-error.ts`, `remediate.ts`, `remediation-error.ts`, `report-hash.ts`, `report-schema.ts`, `run-remediate.ts`, `unattended-select.ts`, `verify.ts`
- **Responsibility**: Orchestrates the business transactions — analyze (run detectors + enrichment, produce a report), publish (turn selected findings into GitHub Issues), remediate (run the matching ecosystem remediator and open a draft PR), and verify/observe (poll PR and Finding Issue state, close issues on confirmed fix). Validates/hashes reports against `schemas/analysis-report.schema.json`.
- **Depends on**: Domain Model & Policy, GitHub Integration Adapters, Detection & Enrichment Adapters, Ecosystem Remediator Adapters, Infrastructure Adapters.

## GitHub Integration Adapters

- **Location**: `src/adapters/github.ts`, `src/adapters/remediation-github.ts`, `src/adapters/gh-auth.ts`, `src/adapters/github-app-auth.ts`, `src/adapters/git.ts`, `src/adapters/errors.ts`
- **Responsibility**: Implements the `GitHubGateway` and `FindingVerificationGateway` ports via `@octokit/rest`/`@octokit/auth-app` (Issues, pull requests, GitHub App authentication) and local Git operations (`LocalGitRepositorySource`, branch/commit handling) via `execa`.
- **Depends on**: Domain Model & Policy, Infrastructure Adapters (process execution).

## Detection & Enrichment Adapters

- **Location**: `src/adapters/trivy.ts`, `src/adapters/kev.ts`, `src/adapters/epss.ts`
- **Responsibility**: Implements the `Detector` port (`TrivyVulnerabilityDetector`, the sole registered detector, version-gated `>=0.60.0 <1.0.0`) and the `EnrichmentProvider` port (`CisaKevProvider`, `FirstEpssProvider`) against external JSON feeds fetched via the shared `fetch` adapter.
- **Depends on**: Domain Model & Policy, Infrastructure Adapters (process execution for Trivy, fetch for KEV/EPSS).

## Ecosystem Remediator Adapters

- **Location**: `src/adapters/npm-remediator.ts`, `python-remediator.ts`, `docker-remediator.ts`, `ruby-remediator.ts`, `terraform-remediator.ts`, `remediator-helpers.ts`, `remediators.ts`
- **Responsibility**: Five code-changing remediators (npm, Python, Docker, Ruby, Terraform), registered by `createDefaultRemediators()`, each proposing/applying a targeted fix for a published, user-selected Finding.
- **Depends on**: Domain Model & Policy, Infrastructure Adapters (process execution, filesystem).

## Infrastructure Adapters

- **Location**: `src/adapters/fs-cache.ts`, `src/adapters/fetch.ts`, `src/adapters/process.ts`
- **Responsibility**: Implements the `Cache` and `Clock` ports (`FileSystemCache`) plus shared low-level primitives — the global `fetch` wrapper used by enrichment adapters and the `execa`-based subprocess runner used by Git, Trivy, and the ecosystem remediators.
- **Depends on**: Domain Model & Policy (port interfaces only).

## Agent Skill Wrapper

- **Location**: `skills/techdebtter/SKILL.md`
- **Responsibility**: Thin conversational wrapper that delegates to the CLI; documented and tested (`test/skills/techdebtter.test.ts`), matching SPEC I10 and README's "Agent skill" section with no scope discrepancy.
- **Depends on**: CLI.
