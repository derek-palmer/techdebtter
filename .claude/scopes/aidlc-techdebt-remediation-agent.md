---
name: techdebt-remediation-agent
depth: Standard
keywords: []
description: "Composed scope for the TechDebtter technical-debt remediation agent - discovery, design, and build spine without delivery/operations ceremony"
skeleton: on
---

# techdebt-remediation-agent scope

Composed scope for TechDebtter: an AI-powered technical-debt remediation agent
that continuously evaluates repositories and workflows for maintainability risks
(dependency drift, security upgrades, deprecated APIs, fragile tests, stale
CI/CD, IaC debt, doc gaps, repetitive code-quality issues), prioritizes findings
by impact/risk/confidence/scope/effort, and - for high-confidence changes -
generates scoped remediation plans, creates issues, and opens reviewable pull
requests with validation and rollback guidance.

## Why these stages, why skip those

The composed plan keeps a focused discovery-plus-design spine and the build
core, and skips the framing, decomposition, and operations ceremony that another
executing stage or the existing codebase already covers.

EXECUTE (14): the three Initialization stages, Intent Capture and Scope
Definition (the intent bundles several detection axes plus prioritization and PR
automation, so meaning and boundaries need pinning), Approval Handoff (the
ideation-to-inception phase gate), Reverse Engineering (an existing brownfield
bot controller, remediators, and CLI/Action surface must be mapped before
extending), Requirements Analysis (its unique functional decomposition,
constraints, and out-of-scope boundary feed the design stages), Domain Design and
Functional Design (detector/prioritizer/remediator component model and per-unit
logic), NFR Requirements and NFR Design (safety of automated PRs, rollback,
confidence thresholds, and privacy handling are primary concerns), then Code
Generation and Build and Test.

SKIP (19): Market Research and Feasibility (the approach is a known pattern and
the viability question lands in Domain Design); Team Formation and the two
mockup stages (no multi-team coordination, no primary UX surface); Practices
Discovery (conventions are embodied in the existing code and test tree, mapped by
Reverse Engineering and enforced at Build and Test); User Stories (acceptance
criteria are captured in Requirements Analysis); Units Generation, Contract
Design, and Delivery Planning (small unit count with light dependencies, no
external contract to pin); Infrastructure Design and the whole Operation tail -
CI Pipeline, Deployment Pipeline, Environment Provisioning, Deployment Execution,
Observability Setup, Incident Response, Performance Validation, and Feedback
Optimization (the project already ships through GitHub Actions; no new
environment, deployment coordination, or operational surface is created here).

## Membership

Composed at Standard depth from an advisory ARS of 47/100. The scope ships
`keywords: []` and is therefore selected only by explicit name
(`--scope techdebt-remediation-agent`); it never participates in scope
inference.
