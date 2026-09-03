# Implementation plan

This document tracks delivery progress, repository layout, and acceptance criteria for remaining work. Canonical task IDs and constraints live in [SPEC.md](../SPEC.md); architecture and decisions live in [docs/architecture.md](architecture.md), [CONTEXT.md](../CONTEXT.md), and [docs/adr/](adr/).

## Delivery status

| Slice | SPEC | Status | Notes |
|---|---|---|---|
| Domain, policy, fingerprints, Criticality, report contracts | T1 | done | `src/domain/`, `schemas/policy.schema.json`, `schemas/analysis-report.schema.json` |
| Local Git + Trivy analysis with KEV/EPSS enrichment | T2 | done | `src/adapters/{git,trivy,kev,epss,fs-cache}.ts`, `src/application/analyze.ts`, `analyze` CLI |
| Interactive selection + idempotent Finding Issue publication | T3 | done | `publish()` CLI, GitHub adapter, tracer acceptance test |
| Installable `/techdebtter` skill | T4 | done | `skills/techdebtter/SKILL.md` + contract tests |
| Database-free GitHub Actions controller | T5 | done | Action phases, App auth, unattended selection, controller template |
| npm + `package-lock.json` Remediator | T6 | done | Static npm upgrades, draft PR budget, CI observation |
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

T3–T6 are complete. Next slice: additional ecosystems + opt-in AI (T7).

## Subsequent slices (T7)

Write a separate execution plan when T7 begins:

1. **T7 — Additional ecosystems:** Ruby, Terraform, Docker, Python Remediator adapters (one independently testable ecosystem per delivery); opt-in AI Detector/planning adapters with privacy and provenance contract tests.

## T5 delivered

- `action.yml` + `src/action/main.ts` with `discover` / `analyze` / `publish` phases
- Phase-scoped GitHub App installation tokens (`src/adapters/github-app-auth.ts`)
- Unattended selection of evidence-verified Critical/High vulnerabilities (`src/application/unattended-select.ts`)
- Controller workflow template (`templates/controller-workflow.yml`) for private org controller repos

## T6 delivered

- Finding remediation coordinates retained through Triage (`packageName`, `fixedVersions`, …)
- `NpmPackageLockRemediator` static direct-dependency upgrades (no lifecycle script execution)
- Remediation budget evaluation and required-CI observation (`remediate`, `observeRemediationPullRequest`)
- Failed/missing required checks stay draft with no autonomous repair loop

