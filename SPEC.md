# TechDebtter specification

## §G Goal

Continuously turn concrete repository debt into prioritized, auditable GitHub work without overwhelming maintainers.

## §C Constraints

- C1: One runtime-selected GitHub Organization per operation; never hard-code owner.
- C2: Operating Scope = explicit TechDebtter scope intersect identity GitHub permissions.
- C3: Support User Identity locally; support permission-scoped Bot Identity through same core.
- C4: TypeScript ESM, Node.js `>=22`, npm, committed `package-lock.json`; CI tests Node 22 + 24.
- C5: Initial tracer deterministic, local, LLM-free: Git + Trivy vulnerability scan + CISA KEV + FIRST EPSS.
- C6: First tracer ends after selected Finding Issues are reconciled; no repository code changes.
- C7: GitHub Issues authoritative Finding backlog; local reports/caches disposable.
- C8: Initial Bot database-free: scheduled/manual GitHub Actions + GitHub App auth + GitHub-native state.
- C9: No telemetry by default. Never upload source, secrets, credentials, or full raw detector output.
- C10: All deterministic tests/checks block `main`; live external smoke tests scheduled, non-blocking.
- C11: No executable dependency, optional skill, or upgrade installs without user approval.
- C12: Initial implementation = one npm package; split only for independently versioned consumer.

## §I Interfaces

- I1: `techdebtter analyze <path> [--include-uncommitted] [--format terminal|json|markdown] [--output <path>] [--fail-on <criticality>]`
- I2: `techdebtter publish <report> --select <id...>`
- I3: `techdebtter capabilities --json`
- I4: `analyze(scope): Promise<AnalysisReport>`; target-repository read-only.
- I5: `publish(report, selections): Promise<PublicationResult>`; explicit GitHub write boundary.
- I6: Root Repository Policy `.techdebtter.yml`; Organization Policy `ORG/.github/.techdebtter.yml`; optional `$schema`.
- I7: Versioned JSON Analysis Report = canonical automation contract; terminal/Markdown = derived views.
- I8: Finding Issue = human body + labels + hidden versioned metadata.
- I9: External ports: `RepositorySource`, `Detector`, `EnrichmentProvider`, `GitHubGateway`, `Cache`, `Clock`.
- I10: User skill `skills/techdebtter/SKILL.md`; thin wrapper over CLI, installable through skills.sh.
- I11: Privileged controller workflow in one private org repository; reusable TechDebtter Action pinned by full SHA.

## §V Invariants

- V1: Unsupported assumption never becomes Finding.
- V2: Every Finding cites verifiable Evidence and provenance.
- V3: Detection remains raw until Triage validates, dedupes, groups, classifies, and prioritizes it.
- V4: One independently actionable Finding maps to one Finding Issue.
- V5: Source Detection Fingerprints remain intact; normalized Finding Fingerprint drives cross-detector reconciliation.
- V6: Same Finding updates/reopens existing issue; new issue requires independently different remediation.
- V7: Analysis never modifies target repository or creates GitHub artifacts.
- V8: Dirty worktree rejected by default. `--include-uncommitted` report is non-reproducible and unpublishable.
- V9: Policy order = product defaults -> Organization Policy -> Repository Policy within org ceilings.
- V10: Present invalid policy stops operation. Confirmed-absent policy falls back. Unverifiable org policy blocks publication/remediation.
- V11: Policy fields define merge semantics; no generic YAML deep merge.
- V12: Bot cannot grant Policy Override. User override = authorized, one-operation, audited.
- V13: Criticality = explainable Critical/High/Medium/Low; never opaque score.
- V14: Relevant confirmed KEV => Critical. Else severity baseline; EPSS may raise one band; missing enrichment never lowers.
- V15: Calculated Criticality retained separately from Effective Criticality and override audit.
- V16: Default unattended publication = evidence-verified Critical/High Vulnerabilities only.
- V17: Default Bot Remediation Budget = one open TechDebtter PR/repo + one new PR/24h.
- V18: `ready-for-agent` means queue-eligible, not immediate execution. `ready-for-human` excludes autonomy.
- V19: GitHub `not planned` closure = Suppression. `completed` closure requires Scan verification.
- V20: Merge triggers verification; Finding closes only when absent from merged Snapshot.
- V21: Bot never executes target-repository code. Local execution requires displayed command + explicit approval.
- V22: Bot Remediation opens draft; repository required CI must pass before ready-for-review.
- V23: Missing/failed required CI keeps draft and routes human. First Remediator has no autonomous repair loop.
- V24: Analysis output JSON stays valid on stdout; errors go stderr. Findings alone do not cause failure without `--fail-on`.
- V25: Cache/artifact loss cannot affect correctness.
- V26: Write token never exposed to Detector or target contents during analysis.
- V27: External Actions use reviewed full commit SHAs.
- V28: Optional `to-issues` absence never blocks parent Finding Issue publication.
- V29: AI use requires policy opt-in, minimum redacted Evidence, named purpose, and recorded provenance.
- V30: PR creation order = highest Effective Criticality within policy and available Remediation Budget.

## §T Tasks

| id | status | task | cites |
|---|---|---|---|
| T1 | done | domain + policy + fingerprint + Criticality + report contracts | I6,I7,I9,V1-V15,V24 |
| T2 | done | local Git/Trivy analysis + KEV/EPSS enrichment | I1,I4,I9,V1-V15,V24-V25 |
| T3 | wip | interactive selection + idempotent Finding Issue publication | I2,I5,I8,V4-V12,V16,V19,V28 |
| T4 | pending | installable thin `/techdebtter` skill | I3,I10,V28 |
| T5 | pending | database-free GitHub Actions controller + App auth | I11,V16-V18,V24-V27,V30 |
| T6 | pending | npm + `package-lock.json` Remediator + draft PR/CI verification | V17-V23,V30 |
| T7 | pending | independent Ruby/Terraform/Docker/Python Remediators + opt-in AI adapters | V21-V23,V29-V30 |

## §B Bugs

| id | date | cause | fix |
|---|---|---|---|
