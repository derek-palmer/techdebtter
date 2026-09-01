# TechDebtter

The shared language for identifying, prioritizing, and remediating technical debt across software repositories.

## Language

**Organization**:
The GitHub organization that bounds the repositories TechDebtter is authorized to inspect and act upon.
_Avoid_: Tenant, account

**User Identity**:
A human operator's authenticated GitHub identity, used when the operator invokes TechDebtter directly.
_Avoid_: Bot, agent

**Bot Identity**:
A non-human GitHub identity used for semi-autonomous operation, limited by explicit organization and repository permissions.
_Avoid_: User, agent

**Operating Scope**:
The explicitly selected organization and repositories within which TechDebtter may inspect or act. It can only narrow, never expand, an identity's GitHub permissions.
_Avoid_: Access, permissions

**Repository Snapshot**:
The exact repository contents evaluated by a Scan, identified by its GitHub repository, commit SHA, and working-tree state.
_Avoid_: Repository, branch

**Finding**:
A unique, evidence-backed, independently actionable condition formed from one or more Detections that have passed Triage. A Finding is classified as Technical Debt, a Vulnerability, or a Defect and is tracked in one GitHub Finding Issue.
_Avoid_: Detection, alert

**Technical Debt**:
A condition that increases the expected cost or risk of changing software in the future.
_Avoid_: Vulnerability, defect

**Vulnerability**:
A weakness that creates an exploitable security risk, whether or not exploitation has occurred.
_Avoid_: Technical debt, defect

**Defect**:
Behavior that currently violates an expected requirement or outcome.
_Avoid_: Technical debt, vulnerability

**Detector**:
A deterministic or AI-backed analysis that produces one or more Detections.
_Avoid_: Scanner

**Detection**:
A raw, evidence-bearing result produced by a Detector that has not yet passed Triage.
_Avoid_: Finding, issue

**Detection Fingerprint**:
The source-specific identity of a Detection, preserving which Detector reported which concrete condition across Scans.
_Avoid_: Finding fingerprint, issue ID

**Evidence**:
Verifiable information that connects a Detection or Finding to concrete repository state, workflow state, detector output, or an authoritative external source.
_Avoid_: Assumption, speculation

**Vulnerability Enrichment**:
Timestamped Evidence from an authoritative external source that adds exploitation, likelihood, or severity context to a vulnerability Detection. Unavailable enrichment is unknown, not negative Evidence.
_Avoid_: Detection, assumption

**Triage**:
The evidence-based evaluation that validates, deduplicates, and groups Detections, then determines each resulting Finding's classification, Criticality, affected scope, and remediation shape.
_Avoid_: Scan, remediation

**Finding Issue**:
The GitHub issue that serves as the durable system of record for one independently actionable Finding after Triage.
_Avoid_: Detection, pull request

**Remediation Route**:
The Triage outcome that marks a fully specified Finding Issue as ready for agent or human implementation.
_Avoid_: Criticality, remediation budget

**Change Risk**:
A characteristic of a proposed Remediation, such as a breaking change or refactor, that increases review or coordination needs without determining its Remediation Route.
_Avoid_: Criticality, human required

**Suppression**:
An explicit maintainer decision to close a Finding Issue without remediation while preserving the Finding and rationale for future reconciliation.
_Avoid_: Remediation, deletion

**Finding Fingerprint**:
The normalized, detector-independent identity used to group equivalent Detections and reconcile the same independently actionable Finding across Scans.
_Avoid_: Issue ID, title

**Remediation Budget**:
The limit on concurrent or newly opened TechDebtter remediation work for a repository, protecting maintainers from automation noise and review overload.
_Avoid_: Finding limit, scan limit

**Criticality**:
The contextual urgency of remediating a Finding, expressed as Critical, High, Medium, or Low and justified by concrete evidence about potential impact, exploitation likelihood or activity, confidence, affected scope, and repository exposure.
_Avoid_: Severity, CVSS score

**Calculated Criticality**:
The Criticality derived by TechDebtter from the current Evidence during Triage.
_Avoid_: Effective criticality

**Effective Criticality**:
The Criticality used by the Remediation Queue, equal to Calculated Criticality unless an authorized maintainer records an auditable override.
_Avoid_: Calculated criticality

**Criticality Override**:
An authorized, auditable replacement for Calculated Criticality that may expire and becomes stale when materially changed Evidence requires reassessment.
_Avoid_: Policy override

**Remediation Queue**:
The ordered set of Findings eligible for remediation within a repository's Remediation Budget, highest Criticality first.
_Avoid_: Backlog, finding list

**Repository Policy**:
Optional, repository-owned configuration that customizes TechDebtter's behavior within Organization Policy, including its Remediation Budget. Safe defaults apply when no policy is present.
_Avoid_: Settings, preferences

**Organization Policy**:
Optional organization-owned configuration loaded from `ORG/.github/.techdebtter.yml` that establishes TechDebtter defaults and hard ceilings for every repository in its Operating Scope.
_Avoid_: Repository policy, permissions

**Policy Override**:
An explicit, auditable exception granted by an authorized User Identity for one requested operation. A Bot Identity cannot grant or reuse an override.
_Avoid_: Policy change, bot exception

**Scan**:
A read-only evaluation of an Operating Scope that produces Detections without modifying target repositories or creating GitHub artifacts.
_Avoid_: Remediation, audit

**Analysis Report**:
The pre-publication view of proposed Findings after Triage, represented canonically as versioned JSON with human-readable terminal and Markdown renderings.
_Avoid_: Finding issue, scan payload

**Publication**:
The explicit GitHub write operation that creates or reconciles selected Findings from a reproducible Analysis Report as Finding Issues.
_Avoid_: Analysis, remediation

**Remediation**:
An authorized attempt to resolve a Finding, subject to policy, the Remediation Budget, and validation before it creates a repository change.
_Avoid_: Scan, finding

**Remediator**:
An ecosystem-specific adapter that proposes and validates a repository change for an eligible Finding.
_Avoid_: Detector, agent

**Validation**:
Evidence that a proposed or merged Remediation satisfies its declared static checks and repository-owned required CI checks.
_Avoid_: Triage, scan

**Controller Repository**:
The private, write-restricted GitHub repository that schedules stateless Bot Identity runs and holds references to GitHub App credentials for one Organization.
_Avoid_: Target repository, database
