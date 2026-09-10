## TechDebtter

TechDebtter is a vulnerability detection and remediation agent for software engineering teams. Today it deterministically scans a local repository checkout with a single detector, [Trivy](https://trivy.dev/), enriches findings with CISA KEV and FIRST EPSS data, prioritizes them using impact, risk, confidence, scope, and estimated remediation effort, and lets a human publish selected findings as GitHub Finding Issues. For direct dependencies in npm, Python, Docker, Ruby, and Terraform manifests it can also open a reviewable, draft remediation pull request with static-only edits (no target lifecycle scripts).

The goal is simple: make technical debt visible, actionable, and steadily smaller without adding unnecessary work to the engineering backlog.

## Project status

The first tracer slice delivers deterministic local vulnerability analysis (single detector: Trivy), user-selected GitHub Finding Issue publication, and static draft remediation PRs across five package-manifest ecosystems (npm, Python, Docker, Ruby, Terraform).

- [Specification](SPEC.md)
- [Architecture](docs/architecture.md)
- [Domain language](CONTEXT.md)
- [Architecture decisions](docs/adr/)
- [Implementation plan](docs/implementation-plan.md)

## Roadmap / Vision

Beyond today's single-detector (Trivy vulnerability) scope, TechDebtter's
longer-term vision is a broader technical-debt agent whose *detection*
side also evaluates dependency drift, deprecated APIs, fragile tests,
stale CI/CD workflows, infrastructure-as-code debt, documentation gaps,
and repetitive code-quality issues — each surfaced, prioritized, and
remediated the way Trivy vulnerability findings are today. None of that
detection breadth beyond Trivy is implemented yet; this section describes
direction, not current capability.

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

Open a draft remediation PR for one finding (static edits only; never runs target lifecycle scripts):

```bash
techdebtter remediate /tmp/report.json --select <selection-id> --path . --yes
```

Omit `--yes` in an interactive terminal to review the intended issue writes before confirming. In non-interactive environments, `--yes` is required.

Observe a remediation draft PR (or all open TechDebtter PRs) and promote it once required CI passes:

```bash
techdebtter observe --owner <owner> --repo <repo> --pull <number>
```

Close Finding Issues whose fingerprints are absent from a fresh, post-merge analysis report:

```bash
techdebtter verify /tmp/post-merge-report.json
```

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
- Secrets: `TECHDEBTTER_APP_ID`, `TECHDEBTTER_APP_INSTALLATION_ID`, `TECHDEBTTER_APP_PRIVATE_KEY`
  (checkout uses `actions/create-github-app-token` — no separate checkout token)

Phases are separate jobs with fresh short-lived installation tokens:

1. **discover** — list installation repositories
2. **analyze** — read-only analysis of one target checkout (App token for checkout)
3. **publish** — reconcile only evidence-verified Critical/High vulnerabilities by default
4. **verify** — close Finding Issues whose fingerprints are absent from the latest Analysis Report
5. **remediate** / **observe** — opt-in via `TECHDEBTTER_ENABLE_REMEDIATION=true` (also requires Organization Policy `defaults.remediation.enabled: true`)

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
