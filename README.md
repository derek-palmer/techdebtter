## TechDebtter

TechDebtter is an AI-powered technical-debt remediation agent for software engineering teams.

It continuously evaluates repositories and engineering workflows for maintainability risks, including dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, and repetitive code-quality issues.

TechDebtter prioritizes findings using impact, risk, confidence, scope, and estimated remediation effort. For high-confidence changes, it can generate scoped remediation plans, create issues, and open reviewable pull requests with validation and rollback guidance.

The goal is simple: make technical debt visible, actionable, and steadily smaller without adding unnecessary work to the engineering backlog.

## Project status

Architecture and initial delivery contracts are specified; implementation proceeds through tested vertical slices beginning with deterministic local vulnerability analysis and selected GitHub Finding Issue publication.

- [Specification](SPEC.md)
- [Architecture](docs/architecture.md)
- [Domain language](CONTEXT.md)
- [Architecture decisions](docs/adr/)
- [Implementation plan](derek-ai-plans/2026-08-31-techdebtter-architecture.md)
