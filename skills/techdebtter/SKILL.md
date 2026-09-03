---
name: techdebtter
description: Analyze a local repository for vulnerabilities and publish selected GitHub Finding Issues through the TechDebtter CLI. Use when the user invokes /techdebtter to scan, review findings, and reconcile issues.
disable-model-invocation: true
---

# TechDebtter

Thin orchestration over the `techdebtter` CLI. All schemas, policy resolution, fingerprints, and validation live in executable code — never duplicate them here.

## When to use

Invoke only when the user explicitly runs `/techdebtter` to:

1. check prerequisites,
2. analyze the current repository,
3. review proposed findings,
4. publish selected findings to GitHub, or
5. optionally hand a complex remediation plan to `to-issues`.

Do not auto-invoke. Do not install tools, upgrade packages, or publish without explicit user approval.

## Workflow

### 1. Resolve the CLI

Prefer a project-pinned binary in this order:

1. `./node_modules/.bin/techdebtter` when present in the repository
2. `npx --no-install techdebtter` when the dependency is already installed
3. Ask the user before running `npm install techdebtter` or any global CLI install/upgrade

Negotiate compatibility before analysis:

```bash
techdebtter capabilities --json
```

Confirm the response includes:

- `commands` containing `analyze`, `publish`, and `capabilities`
- `publicationSupported: true`
- a `reportSchemaVersions` entry the skill understands (currently `1.0.0`)

If capabilities are missing or incompatible, stop and ask whether to install or upgrade the CLI. Never install silently.

### 2. Verify prerequisites

Before analysis, confirm:

- **Node.js** `>=22` is available
- **GitHub CLI** is installed and authenticated (`gh auth status`)
- **Trivy** is on `PATH` and within the supported version range reported by analyze failures

Surface installation guidance from CLI errors on `stderr`. Do not run `gh auth login`, install Trivy, or modify credentials without user approval.

### 3. Analyze the repository

Run analysis against the user's selected checkout (default `.`):

```bash
techdebtter analyze . --format json --output /tmp/techdebtter-report.json
```

If the worktree is dirty, explain that publication requires a committed, reproducible snapshot. Offer `--include-uncommitted` only when the user explicitly wants a non-publishable preview.

Present findings from the report using each finding's `selectionId`, title, effective criticality, and route. Do not invent findings or change criticality.

### 4. Collect explicit selections

Ask the user which `selectionId` values to publish. Require explicit IDs — never publish all findings by default.

Restate the target repository (`owner/repo` from the report snapshot) and the selected finding titles before continuing.

### 5. Confirm publication

Show the exact `publish` command and intended GitHub actions. Obtain explicit confirmation before running:

```bash
techdebtter publish /tmp/techdebtter-report.json --select <id...>
```

In non-interactive environments, require the user to approve adding `--yes`.

Reject publication when:

- `reproducible` is `false`
- `policy.verified` is `false`
- the user has not confirmed the selection list

### 6. Report results

After publication, summarize created/updated/reopened issues from the CLI `PublicationResult`. Preserve warnings from the report and publication output.

### 7. Optional complex-plan handoff

When a selected finding's route implies decomposition (`needs-triage`, `ready-for-human` with a multi-step plan, or the user asks for child tickets):

- Offer to hand the remediation plan to [`to-issues`](https://github.com/nicobailon/to-issues) when installed
- Ask before suggesting installation through the supported upstream installer
- Never install `to-issues` silently
- If unavailable, keep the complete remediation plan on the parent Finding Issue

## Constraints

- Call the CLI; do not reimplement policy defaults, JSON Schema, or report hashing in this skill.
- Never upload repository source, secrets, tokens, or full raw scanner output.
- Never pass tokens on the command line; rely on `gh auth token` through the CLI.
- Treat `ready-for-agent` as queue eligibility, not an automatic publish or remediation trigger.

## Installation

Project-local (default):

```bash
npx skills add derek-palmer/techdebtter --skill techdebtter
```

Global install:

```bash
npx skills add derek-palmer/techdebtter --skill techdebtter -g
```

Pass `--agent <name>` when the skills CLI prompts for a target agent. Scope and agent selection remain the user's choice.
