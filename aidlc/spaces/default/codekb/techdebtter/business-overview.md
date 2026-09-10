# Business Overview — TechDebtter

## Purpose

TechDebtter is a technical-debt and vulnerability remediation agent, shipped as an npm CLI, a programmatic library, and a GitHub Action. It analyzes a repository, publishes findings as GitHub "Finding Issues," and applies (or proposes) code-changing remediations for a defined set of package ecosystems, gated by an explicit human-selection step before any code is changed.

## Delivered Scope (as verified against the code)

The delivered first tracer slice is deterministic and local, with no LLM-in-the-loop for detection or remediation decisions:

- **Detection**: a single vulnerability detector (`TrivyVulnerabilityDetector`, `id: "trivy-vulnerability"`) that shells out to the Trivy CLI, enriched with the CISA Known Exploited Vulnerabilities (KEV) catalog and the FIRST Exploit Prediction Scoring System (EPSS) feed.
- **Publication**: user-selected findings are published as GitHub Issues ("Finding Issues") via the GitHub REST API.
- **Remediation**: five ecosystem-specific, code-changing remediators — npm (`package-lock.json`), Python (`requirements.txt`), Docker (`FROM` base image tags), Ruby (`Gemfile` pins), and Terraform (`required_providers` versions) — propose or apply fixes for published, user-selected findings via draft pull requests.
- **Verification/Observation**: a bot-controller surface (`observe`, `verify`) tracks pull-request state and closes Finding Issues once a fix lands, driven by a dedicated `FindingVerificationGateway` port (see `api-documentation.md`).

## Key Documentation Gap (this workflow's central finding)

README.md's opening description claims continuous detection across eight technical-debt categories — dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, and repetitive code-quality issues. Only one of those (a slice of "security-related upgrades," via vulnerability scanning) is implemented. SPEC.md C5, `docs/architecture.md`'s "First tracer flow" section, and README's own "Project status" line all agree with the code's narrower, accurate scope — only README's top-of-file marketing description is overstated. See `code-quality-assessment.md` for the full documentation-gap register and `component-inventory.md` / `architecture.md` for what is actually implemented.

Remediation breadth (the five ecosystem remediators) is documented accurately and matches the code exactly — this is not part of the overstatement.

## Primary Users

- **Repository maintainers / developers**: run `analyze`, review findings, `publish` selected findings as GitHub Issues, and `remediate` selected findings via the CLI or the agent skill wrapper.
- **Bot controller / CI automation**: drives the GitHub Action's `discover` → `analyze` → `publish` → `remediate` → `observe` → `verify` phases unattended, per an organization or repository policy file (`.techdebtter.yml`).

## Key Functionality

1. Deterministic local analysis of a Git repository for known vulnerabilities (Trivy), enriched with exploit-likelihood/exploited-in-the-wild signal (EPSS/KEV).
2. Human- or policy-gated selection of which findings to publish and which to remediate — no unattended detection-to-remediation autopilot without an explicit selection step.
3. Ecosystem-aware, code-changing remediation with draft pull requests, bounded by a configurable draft-PR budget.
4. Bot lifecycle tracking (`observe`/`verify`) that closes Finding Issues once a remediation lands and is confirmed.
5. Policy-driven customization via JSON-Schema-validated organization/repository policy files (`schemas/policy.schema.json`).
