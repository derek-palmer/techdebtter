# Code Quality Assessment — TechDebtter

## Positive Signals

- **No `TODO`/`FIXME`/`HACK` markers, no `eslint-disable` comments, and no `any`/`as any` usages anywhere in `src/`** — strict TypeScript throughout, with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitOverride` all enabled in `tsconfig.json`. There is little to no code-level rot to detect in this codebase today — notable given README's "repetitive code-quality issues" detection claim (see Documentation Gaps below).
- **Test suite mirrors source 1:1**: 28 `*.test.ts` files across `test/action/`, `test/adapters/`, `test/application/`, `test/cli/`, `test/domain/`, `test/skills/`, matching the `src/` structure. `npx vitest run` → 28 files / 130 tests passing.
- **Substantive documentation set**: README.md, SPEC.md, CONTEXT.md, AGENTS.md, `docs/architecture.md`, `docs/implementation-plan.md`, `docs/adr/0001–0007` (Context/Decision format), `docs/agents/` all present. Inline documentation is light but the code is largely self-documenting via descriptive names and strict typing, with targeted doc comments on non-obvious fields (e.g. `Finding.packageEcosystem` in `src/domain/model.ts`).
- **CI enforces the full check chain before merge**: `.github/workflows/ci.yml` runs `npm run check` (lint + typecheck + test) and `npm run build` on a Node 22/24 matrix, on both `push` to `main` and `pull_request`, matching SPEC C10's "all deterministic tests/checks block main." `actions/checkout`/`actions/setup-node` are pinned to full commit SHAs (SPEC C6/V27).

## Test Coverage

- **Tooling**: Vitest ^4.1.11 (`vitest.config.ts` sets only `test.include`).
- **Coverage configuration**: absent. No `test.coverage` block in `vitest.config.ts`, no coverage provider (e.g. `@vitest/coverage-v8`) in `devDependencies`, and no coverage flag or upload step in CI. The org's default 80% line-coverage floor (`org.md` Testing Posture) cannot currently be measured or enforced by this repo's own tooling. Not a defect for this pass's documentation-correction scope, but relevant context for a future test-strategy stage.

## Linting

- ESLint 10 flat config (`eslint.config.js`): `@eslint/js` recommended + `typescript-eslint` recommended, plus two custom rules (`consistent-type-imports`, `no-unused-vars` with `^_` ignore pattern). The `ignores` block excludes `dist/**`, `node_modules/**`, `coverage/**`, and the three root config files, but only the rules-block config object is scoped to `files: ["src/**/*.ts", "test/**/*.ts"]` — the earlier recommended-config blocks apply unscoped. `npx eslint src test` is clean; a bare `eslint .` also lints `.claude/tools/` (the AI-DLC harness's own TypeScript, outside `tsconfig.json`'s `include`), which is harness noise rather than a product defect (not re-verified in this pass).

## Documentation Gaps (this workflow's core findings)

1. **README.md overstates detection scope vs. `src/` (the central finding for this intent)** — README's opening description claims detection across 8 categories (dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, repetitive code-quality issues). The only registered `Detector` is `TrivyVulnerabilityDetector` (`src/adapters/trivy.ts`, `id: "trivy-vulnerability"`), confirmed by `productDefaults.detectors` in `src/domain/policy.ts` (`allowed`/`required` both `["trivy-vulnerability"]`) and by the CLI's own `capabilities --json` output. SPEC.md C5, `docs/architecture.md`'s "First tracer flow" section, and README's own "Project status" line all correctly describe the delivered scope as deterministic Git + Trivy + CISA KEV + FIRST EPSS — only README's top-of-file marketing description is out of step. SPEC/architecture/code agree with each other and with the passing test suite; this is a README-specific overstatement, not a cross-document disagreement requiring reconciliation. Remediation breadth (npm/Python/Docker/Ruby/Terraform) is, by contrast, documented accurately and matches the code exactly.
2. **`FindingVerificationGateway` (7th port) undocumented in SPEC/architecture** — `src/domain/ports.ts` defines 7 port interfaces, but SPEC I9 and `docs/architecture.md`'s "External ports" section both say "six ports" and name only six. The port is real, used (`src/application/verify.ts`), and tested (`test/application/verify.test.ts`) — a docs-vs-code undercount, not a missing capability.
3. **No scheduled/non-blocking smoke-test workflow found** — SPEC C10 and `docs/architecture.md`'s "Implementation shape" both describe live GitHub/CISA/FIRST smoke tests running on a non-blocking schedule, but `.github/workflows/` contains only `ci.yml` (push/PR-triggered, no `schedule:` trigger). May live in an out-of-scope private controller repo, or may be an undelivered doc claim — flagged as a decision for the human rather than a silent correction, per this project's learned practice for cross-document disagreements.
4. **`observe`/`verify` CLI subcommands undocumented in README's user-facing Usage section** — both exist, are implemented, and are tested (`test/cli/observe-verify.test.ts`), but README's "Usage" section does not mention them; they surface only implicitly via the "Bot controller" phases list.

## Minor Technical Debt

- **Duplication between `src/cli/bootstrap.ts` and `src/action/main.ts`'s `createAnalyzeDependencies`** — both independently wire the same core adapters with slightly different cache paths and no shared factory. Contained, low-risk.

## No Coverage Threshold Configured

See Test Coverage above — no `coverage` block in `vitest.config.ts`, no coverage devDependency, no CI coverage gate. Cross-referenced here rather than repeated: this is the same fact as the Test Coverage section's "Coverage configuration" finding.
