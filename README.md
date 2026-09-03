## TechDebtter

TechDebtter is an AI-powered technical-debt remediation agent for software engineering teams.

It continuously evaluates repositories and engineering workflows for maintainability risks, including dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, and repetitive code-quality issues.

TechDebtter prioritizes findings using impact, risk, confidence, scope, and estimated remediation effort. For high-confidence changes, it can generate scoped remediation plans, create issues, and open reviewable pull requests with validation and rollback guidance.

The goal is simple: make technical debt visible, actionable, and steadily smaller without adding unnecessary work to the engineering backlog.

## Project status

The first tracer slice delivers deterministic local vulnerability analysis and user-selected GitHub Finding Issue publication.

- [Specification](SPEC.md)
- [Architecture](docs/architecture.md)
- [Domain language](CONTEXT.md)
- [Architecture decisions](docs/adr/)
- [Implementation plan](docs/implementation-plan.md)

## Prerequisites

- Node.js 22 or newer
- [GitHub CLI](https://cli.github.com/) authenticated for publication (`gh auth login`)
- [Trivy](https://trivy.dev/) on `PATH` within the supported version range

## Install

Project-local (recommended):

```bash
npm install techdebtter
```

One-off:

```bash
npx techdebtter --help
```

## Usage

Analyze a local checkout and write a versioned JSON report:

```bash
techdebtter analyze . --format json --output /tmp/report.json
```

Review findings in the terminal (default), JSON, or Markdown. Each finding has a stable `selectionId` for publication.

Publish selected findings to GitHub Finding Issues:

```bash
techdebtter publish /tmp/report.json --select <selection-id> --yes
```

Omit `--yes` in an interactive terminal to review the intended issue writes before confirming. In non-interactive environments, `--yes` is required.

Inspect CLI capabilities for skill or automation negotiation:

```bash
techdebtter capabilities --json
```

## Agent skill

Install the `/techdebtter` skill for conversational analyze → select → publish orchestration:

```bash
npx skills add derek-palmer/techdebtter --skill techdebtter
```

Global install:

```bash
npx skills add derek-palmer/techdebtter --skill techdebtter -g
```

The skill is a thin wrapper over this CLI. Pass `--agent <name>` when prompted. See `skills/techdebtter/SKILL.md` for the workflow contract.

## Bot controller (GitHub Actions)

Organizations run TechDebtter unattended from a private controller repository. Copy `templates/controller-workflow.yml`, pin `uses:` lines to a reviewed full commit SHA, and configure:

- Variables: `TECHDEBTTER_ORGANIZATION`
- Secrets: `TECHDEBTTER_APP_ID`, `TECHDEBTTER_APP_INSTALLATION_ID`, `TECHDEBTTER_APP_PRIVATE_KEY`, plus a contents-read checkout token

Phases are separate jobs with fresh short-lived installation tokens:

1. **discover** — list installation repositories
2. **analyze** — read-only analysis of one target checkout
3. **publish** — reconcile only evidence-verified Critical/High vulnerabilities by default

## Remediation (npm)

The first code-changing remediator upgrades **direct** dependencies in `package.json` + `package-lock.json` with static edits only (no target lifecycle scripts). Bot mode opens a **draft** PR when Remediation Budget allows, then observes required CI:

- all required checks pass → mark ready for review
- missing or failed checks → keep draft and route to a human (no autonomous repair)

Additional static remediators cover Python `requirements.txt`, Docker `FROM` tags, Ruby `Gemfile` pins, and Terraform `required_providers` versions. AI planning adapters remain **policy opt-in** and send only hashed Evidence with named purpose/provider/model provenance.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `2` | Invalid input, policy, report, or publication selection |
| `3` | Missing prerequisite or authentication failure |
| `4` | Operational failure or cancelled publication |
| `10` | `--fail-on` threshold met during analyze |

Machine-readable errors are written to `stderr` as JSON so `stdout` remains valid JSON when `--format json` is used.

## Non-reproducible reports

Dirty worktrees are rejected by default. Pass `--include-uncommitted` to analyze uncommitted changes; the resulting report is marked non-reproducible and **cannot be published** until changes are committed and the repository is reanalyzed.
