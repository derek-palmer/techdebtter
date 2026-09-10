# Reverse Engineering Timestamp — TechDebtter

- **Date performed**: 2026-09-09
- **Commit hash** (pre-scan snapshot): `cd83c8059e692d544f848cce21e489242277e6de`
- **Verdict at scan start**: `NO_STORE` — first reverse-engineering scan ever performed for this repository; no prior codekb store existed to merge with.
- **Scan kind**: Full rescan of the whole repository (`kind: full`), synthesized from the developer's code scan handoff (`aidlc/spaces/default/intents/260909-techdebt-remediation-age/inception/reverse-engineering/developer-scan.md`), covering source (`src/`), tests (`test/`), schemas, tooling config, CI, and all top-level documentation (README.md, SPEC.md, CONTEXT.md, AGENTS.md, `docs/`).
- **Intent**: `techdebt-remediation-age` — confirm TechDebtter's documentation matches what the code actually does, correct documentation that overstates the code, and repair small contained defects.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: techdebt-remediation-age
fingerprint: cd83c8059e692d544f848cce21e489242277e6de
analyzed:
  paths:
    - ./
    - src/
    - src/domain/
    - src/application/
    - src/adapters/
    - src/cli/
    - src/action/
    - test/
    - test/fixtures/
    - skills/techdebtter/
    - schemas/
    - templates/
    - docs/
    - docs/adr/
    - docs/agents/
    - .github/workflows/
    - README.md
    - SPEC.md
    - CONTEXT.md
    - AGENTS.md
    - action.yml
    - package.json
    - tsconfig.json
    - tsup.config.ts
    - eslint.config.js
    - vitest.config.ts
  components:
    - CLI
    - GitHub Action Controller
    - Library Entry Point
    - Domain Model & Policy
    - Application Use-Cases
    - GitHub Integration Adapters
    - Detection & Enrichment Adapters
    - Ecosystem Remediator Adapters
    - Infrastructure Adapters
    - Agent Skill Wrapper
shallow:
  paths:
    - package-lock.json
    - dist/
    - node_modules/
```
