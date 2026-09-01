# Implementation plan

This document tracks delivery progress, repository layout, and acceptance criteria for remaining work. Canonical task IDs and constraints live in [SPEC.md](../SPEC.md); architecture and decisions live in [docs/architecture.md](architecture.md), [CONTEXT.md](../CONTEXT.md), and [docs/adr/](adr/).

## Delivery status

| Slice | SPEC | Status | Notes |
|---|---|---|---|
| Domain, policy, fingerprints, Criticality, report contracts | T1 | done | `src/domain/`, `schemas/policy.schema.json`, `schemas/analysis-report.schema.json` |
| Local Git + Trivy analysis with KEV/EPSS enrichment | T2 | done | `src/adapters/{git,trivy,kev,epss,fs-cache}.ts`, `src/application/analyze.ts`, `analyze` CLI |
| Interactive selection + idempotent Finding Issue publication | T3 | in progress | `publish()` and GitHub adapter implemented; `publish` CLI and full tracer acceptance pending |
| Installable `/techdebtter` skill | T4 | pending | `skills/techdebtter/SKILL.md` placeholder only |
| Database-free GitHub Actions controller | T5 | pending | `src/action/` not started |
| npm + `package-lock.json` Remediator | T6 | pending | |
| Ruby, Terraform, Docker, Python Remediators + opt-in AI | T7 | pending | |

## Repository layout

```text
src/
  domain/          # model, ports, policy, fingerprint, criticality, triage
  application/     # analyze, publish, report schema/hash
  adapters/        # git, trivy, kev, epss, fs-cache, gh-auth, github, local-policy, process
  cli/             # analyze, publish, capabilities commands and renderers
  action/          # (future) GitHub Actions entrypoint
schemas/           # policy.schema.json, analysis-report.schema.json
skills/techdebtter/  # thin CLI orchestration skill (T4)
test/
  domain/
  adapters/
  application/
  cli/
  fixtures/        # git, trivy, kev, epss, policy, report, github payloads
.github/workflows/ci.yml
```

Key interfaces:

- `analyze(scope): Promise<AnalysisReport>` — read-only toward target repository and GitHub workflow.
- `publish(report, selections): Promise<PublicationResult>` — explicit GitHub write boundary.
- Six external ports: `RepositorySource`, `Detector`, `EnrichmentProvider`, `GitHubGateway`, `Cache`, `Clock`.

## Remaining first-tracer work (T3 completion)

### CLI `publish` and `capabilities`

**Files:** `src/cli/main.ts`, `test/cli/publish.test.ts`, `test/cli/capabilities.test.ts`, `test/cli/tracer.test.ts`, `README.md`

**Acceptance criteria:**

- `techdebtter publish <report> --select <id...>` wires Task 7 `publish()`; rejects unknown IDs, duplicates, non-reproducible reports, schema failures, unverified Organization Policy, and out-of-scope owner/repo.
- Interactive mode summarizes intended issue writes before confirmation; `--yes` only for already explicit selections.
- `--format json` emits `PublicationResult` on stdout; operational errors stay on stderr.
- `techdebtter capabilities --json` reports CLI version, supported report schema versions, commands, detectors, and publication support.
- Full tracer integration test: temp Git repo + fake Trivy/fetch/GitHub → `analyze --format json --output <path>` → `publish --select <id> --yes` twice → one Finding Issue created then reconciled on second run.
- README documents prerequisites, install/`npx` usage, analyze/report/select/publish flow, exit codes, and non-reproducible report restriction.

## Next slice: installable skill (T4)

**Files:** `skills/techdebtter/SKILL.md`, `test/skills/techdebtter.test.ts`, `README.md`

**Acceptance criteria:**

- Frontmatter name `techdebtter`; user invocation only.
- Calls `capabilities --json`; prefers project-pinned CLI; asks before CLI install/upgrade.
- Verifies `gh` and Trivy prerequisites; analyzes before selection; confirms explicit selection before publication.
- Offers but never auto-installs `to-issues`; contains no duplicated policy defaults or report schema.
- Document project-local (`npx skills add OWNER/techdebtter --skill techdebtter`) and global (`-g`) installation.

## Subsequent slices (T5–T7)

Write separate execution plans when each slice begins:

1. **T5 — Bot controller:** database-free controller repository workflow, GitHub App phase-scoped tokens, scheduled/`workflow_dispatch` runs, unattended Critical/High Vulnerability publication default.
2. **T6 — npm Remediator:** `package.json` + `package-lock.json` direct dependency upgrades, draft PR lifecycle, required CI observation, post-merge verification Scan.
3. **T7 — Additional ecosystems:** Ruby, Terraform, Docker, Python Remediator adapters (one independently testable ecosystem per delivery); opt-in AI Detector/planning adapters with privacy and provenance contract tests.
