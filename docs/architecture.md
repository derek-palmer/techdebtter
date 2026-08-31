# TechDebtter architecture

## Purpose

TechDebtter converts evidence-backed repository conditions into a controlled GitHub workflow. The initial product proves analysis and issue publication before it gains code-changing Remediation.

## System boundary

Each operation targets one runtime-selected GitHub Organization. Effective Operating Scope is the intersection of:

1. repositories and permissions granted to the active User Identity or Bot Identity;
2. Organization Policy;
3. explicitly selected TechDebtter scope; and
4. narrower Repository Policy.

No configuration can expand GitHub permissions. The core exposes two operations:

```ts
analyze(scope: OperatingScope): Promise<AnalysisReport>
publish(report: AnalysisReport, selections: SelectionId[]): Promise<PublicationResult>
```

`analyze` is read-only toward the target repository and GitHub workflow. `publish` is the explicit GitHub write boundary. Later Remediation is a separate authorized operation.

## First tracer flow

```mermaid
flowchart LR
  CLI[Local CLI] --> Snapshot[Repository Snapshot]
  Snapshot --> Trivy[Trivy Detector]
  Trivy --> Detections
  Detections --> Enrich[KEV + EPSS enrichment]
  Enrich --> Triage
  Triage --> Report[Analysis Report JSON]
  Report --> Select[User selection]
  Select --> Publish[GitHub publication]
  Publish --> Issues[Finding Issues]
```

1. `techdebtter analyze .` resolves repository identity and exact commit SHA from Git.
2. A dirty worktree fails unless `--include-uncommitted` is supplied. Such a report is explicitly non-reproducible and cannot be published.
3. Trivy emits vulnerability Detections through a versioned JSON adapter.
4. CISA KEV and FIRST EPSS add timestamped external Evidence. Missing enrichment remains unknown and reduces confidence; it never lowers Criticality.
5. Triage validates Evidence, deduplicates and groups Detections, calculates Finding identity and Criticality, and proposes a Remediation Route.
6. Versioned JSON is the canonical Analysis Report. Terminal and Markdown output are renderings of that model.
7. User selects stable report IDs. `publish` creates or reconciles only selected Finding Issues.

## Domain and identity

A Detector result is a Detection, never immediately a Finding. Triage may combine Detections when one independently actionable remediation resolves them. The source-specific Detection Fingerprint preserves provenance; a normalized detector-independent Finding Fingerprint identifies equivalent Findings across tools and Scans.

Each Finding is exactly one of Technical Debt, Vulnerability, or Defect. Criticality is an explainable band—Critical, High, Medium, or Low—not an opaque score. Calculated Criticality preserves the Evidence-derived result; Effective Criticality is the queue value after an authorized, expiring, auditable override.

Vulnerability rules are deterministic:

1. relevant, confirmed CISA KEV evidence produces Critical;
2. otherwise authoritative severity establishes the baseline;
3. EPSS above the policy threshold may raise one band;
4. concrete repository exposure Evidence may adjust the band with an explanation; and
5. unavailable enrichment never lowers the result.

## Policy

Policy resolves field by field:

```text
product defaults
  -> ORG/.github/.techdebtter.yml defaults + hard ceilings
  -> REPO/.techdebtter.yml narrower values
```

Both policy files are optional and use a published JSON Schema. `$schema` is optional; no format version is required until a breaking contract exists. A present file with unknown keys, malformed data, or invalid limits stops the operation. A confirmed-absent file falls back to the next layer.

If Organization Policy cannot be verified because `.github` is inaccessible or retrieval fails, analysis may continue with a prominent warning. Publication and autonomous Remediation remain blocked.

Merge semantics belong to each field. Repository defaults may override within hard bounds; allowed Detectors intersect; organization-required Detectors cannot be disabled; exclusions accumulate; other lists replace unless their schema says otherwise.

## GitHub Finding workflow

GitHub Issues are authoritative. Reports, raw scanner output, caches, and workflow artifacts are disposable.

Each Finding Issue contains readable Evidence and remediation guidance plus hidden versioned metadata for Detection Fingerprints, Finding Fingerprint, source provenance, analyzed commit, schema version, and reconciliation state. Publication lazily creates the configured labels:

- `techdebtter`
- one class label: `techdebtter:debt`, `techdebtter:vulnerability`, or `techdebtter:defect`
- one Criticality label
- optional `techdebtter:breaking-change` and `techdebtter:refactor`
- one route: `needs-triage`, `needs-info`, `ready-for-agent`, or `ready-for-human`

Repository Policy may map semantic labels onto local names. `ready-for-agent` only admits a Finding to the Remediation Queue; policy, Criticality, cadence, and budget still control execution.

Reconciliation rules:

- matching open issue: refresh Evidence and metadata;
- remediated issue with recurring Finding: reopen;
- suppressed issue: remain closed until expiry or materially different Evidence;
- independently different remediation: create a new issue;
- GitHub close reason `not planned`: Suppression;
- GitHub close reason `completed`: claimed remediation, verified by the next Scan.

Complex Findings may be handed to `to-issues` for child tickets. The integration is optional. If unavailable, TechDebtter offers installation only to an interactive user and otherwise publishes the complete plan on the parent Finding Issue.

## External ports

The core owns Triage, policy resolution, grouping, fingerprints, Criticality, reconciliation, and report generation. Volatile boundaries use six ports:

- `RepositorySource`: immutable Repository Snapshot
- `Detector`: evidence-bearing Detections
- `EnrichmentProvider`: timestamped external facts
- `GitHubGateway`: policy reads and GitHub reconciliation
- `Cache`: disposable acceleration only
- `Clock`: deterministic cadence and expiry

The first adapters are local Git, Trivy JSON, CISA KEV JSON, FIRST EPSS API, GitHub through Octokit, filesystem cache, and system clock.

## Local delivery

The first delivery adapter is a Node.js CLI using the active GitHub CLI account. It checks `gh auth status`, obtains `gh auth token` transiently, passes it in memory, and never logs or persists it. Trivy is an external prerequisite with a supported version range, provenance capture, and installation guidance; TechDebtter never installs it silently.

The npm package exposes `techdebtter`. Supported use includes project-pinned installation, user-level installation, and one-off `npx`. The project also ships one user-invoked `skills/techdebtter/SKILL.md`; the skill calls the CLI rather than duplicating schemas or policy logic. `techdebtter capabilities --json` negotiates CLI/skill compatibility.

## Stateless Bot delivery

The initial Bot uses one private, write-restricted controller repository per Organization. Its GitHub Actions workflow runs daily or through `workflow_dispatch`, uses a GitHub App installed only on permitted repositories, and calls a full-SHA-pinned TechDebtter Action.

No Bot database exists. Each run reconstructs current GitHub state and reconciles idempotently. GitHub Issues, PRs, labels, and hidden metadata remain durable; Actions artifacts are expiring diagnostics and caches are optional acceleration.

Discovery, analysis, publication, and later Remediation use separate jobs and fresh short-lived tokens. Discovery resolves Organization Policy with read access scoped to the organization's `.github` repository; analysis receives read access scoped to one target repository. Write tokens exist only in publication or Remediation jobs and are never exposed to Trivy or target contents.

The unattended publication default includes only evidence-verified Critical and High Vulnerabilities. Policy may opt in other Criticalities or later Finding classes.

## Remediation safety

The default Bot Remediation Budget permits one open TechDebtter PR per repository and one new PR per 24 hours. Scans and Finding reconciliation continue when the budget is exhausted; the highest Effective Criticality eligible Finding runs when capacity returns.

The first code-changing adapter handles direct dependency upgrades in `package.json` plus `package-lock.json`. Ruby, Terraform, Docker, Python, other npm lockfiles, and AI-backed workflows are later adapters.

Local User Identity mode shows exact install/build/test commands and executes them only after approval. Bot Identity never executes target-repository code itself. It performs static validation, opens a draft PR, and relies on the repository's required CI. Passed required checks may promote the PR to ready; missing or failed checks keep it draft and route it to a human. The first Remediator does not attempt autonomous CI repair.

A merge triggers a new Scan. The Finding Issue closes only after the Finding is absent from the merged Repository Snapshot.

## Implementation shape

The initial implementation remains one npm package:

```text
src/
  domain/
  application/
  adapters/
  cli/
  action/
schemas/
skills/techdebtter/
```

Node.js 22 is the runtime floor; CI covers Node 22 and 24; the Action targets Node 24. Every PR must pass lint, type-check, schema, unit, adapter-contract, CLI-integration, package-build, and Action-build checks before merge. Live GitHub, CISA, and FIRST smoke tests run on a non-blocking schedule.

## Delivery slices

1. Domain, policy, fingerprint, Criticality, and report contracts.
2. Local Git and Trivy analysis with KEV and EPSS.
3. Interactive selection and idempotent Finding Issue publication.
4. Installable `/techdebtter` skill.
5. Database-free GitHub Actions controller.
6. npm/`package-lock.json` Remediation with draft PR and CI verification.
7. Independent Ruby, Terraform, Docker, Python, and opt-in AI adapters.
