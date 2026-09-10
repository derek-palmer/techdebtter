## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  README.md
  SPEC.md
  CONTEXT.md
  AGENTS.md
  docs/architecture.md
  docs/implementation-plan.md
  docs/adr/
  docs/agents/
  action.yml
  package.json
  tsconfig.json
  tsup.config.ts
  eslint.config.js
  vitest.config.ts
  .github/workflows/ci.yml
  schemas/analysis-report.schema.json
  schemas/policy.schema.json
  skills/techdebtter/SKILL.md
  templates/controller-workflow.yml
  src/index.ts
  src/domain/model.ts
  src/domain/ports.ts
  src/domain/criticality.ts
  src/domain/fingerprint.ts
  src/domain/policy.ts
  src/domain/policy-error.ts
  src/domain/remediation.ts
  src/domain/triage.ts
  src/application/analyze.ts
  src/application/bot.ts
  src/application/publish.ts
  src/application/publish-error.ts
  src/application/remediate.ts
  src/application/remediation-error.ts
  src/application/report-hash.ts
  src/application/report-schema.ts
  src/application/run-remediate.ts
  src/application/unattended-select.ts
  src/application/verify.ts
  src/adapters/ai.ts
  src/adapters/docker-remediator.ts
  src/adapters/epss.ts
  src/adapters/errors.ts
  src/adapters/fetch.ts
  src/adapters/fs-cache.ts
  src/adapters/gh-auth.ts
  src/adapters/git.ts
  src/adapters/github-app-auth.ts
  src/adapters/github.ts
  src/adapters/kev.ts
  src/adapters/local-policy.ts
  src/adapters/npm-remediator.ts
  src/adapters/process.ts
  src/adapters/python-remediator.ts
  src/adapters/remediation-github.ts
  src/adapters/remediator-helpers.ts
  src/adapters/remediators.ts
  src/adapters/ruby-remediator.ts
  src/adapters/terraform-remediator.ts
  src/adapters/trivy.ts
  src/cli/bootstrap.ts
  src/cli/exit-codes.ts
  src/cli/main.ts
  src/cli/render.ts
  src/action/main.ts
  test/ (directory listing of all 28 `*.test.ts` files and `test/fixtures/`)
- **Skimmed only**:
  package-lock.json (dependency tree, not read line by line)
  dist/ (build output; not present/relevant in a source-controlled scan)
  node_modules/ (vendored, excluded from analysis)

### Packages Found
- techdebtter — npm CLI + library + GitHub Action — TypeScript (ESM) — AI-powered/deterministic technical-debt and vulnerability remediation agent; single npm package per SPEC C12, no monorepo/workspaces.

### Build System
- **Type**: npm (Node.js >=22, ESM `"type": "module"`) with `tsup` for bundling and `tsc` for type-checking.
- **Config Files**: `package.json`, `tsconfig.json`, `tsup.config.ts`, `eslint.config.js`, `vitest.config.ts`.
- **Build Dependencies**:
  `tsup.config.ts` produces three bundles: `index.js` (library entry, with `.d.ts`), `cli/main.js` + `cli/bootstrap.js` (CLI, shebang banner), `action/main.js` (GitHub Action, `noExternal: [/.*/]` — all deps bundled so the Action runs with no separate `npm install`).
  `src/cli/main.ts` dynamically imports `src/cli/bootstrap.ts` for default dependency wiring only when run as the entry module (`import.meta.url === entryPath`), keeping the CLI testable without bootstrapping real adapters.
  `src/action/main.ts` wires `LocalGitRepositorySource`, `TrivyVulnerabilityDetector`, `CisaKevProvider`, `FirstEpssProvider`, `OctokitGitHubGateway`, `OctokitRemediationGateway`, `FileSystemCache` directly (no shared bootstrap module with the CLI — some duplication between `cli/bootstrap.ts` and `action/main.ts`'s `createAnalyzeDependencies`).
  `package.json` `scripts.check` = `lint && typecheck && test`; `prepack` runs `build` before publish.
  npm scripts: `build` (tsup), `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `check`, `prepack`.

### APIs Discovered
- CLI (Commander-based, `src/cli/main.ts`) — 6 subcommands: `analyze <path>`, `capabilities [--json]`, `publish <report> --select <id...>`, `remediate <report> --select <id> [--path] [--base-branch]`, `observe --owner --repo [--pull] [--head-sha]`, `verify <report>`. All match SPEC I1–I3 plus the bot-facing `remediate`/`observe`/`verify` surface documented in README's "Bot controller" section (README's CLI usage section only documents `analyze`, `publish`, `remediate`, `capabilities`; `observe` and `verify` exist in code and are exercised by the Action but are not documented as user-facing CLI subcommands in README's "Usage" section).
- GitHub Action (`src/action/main.ts`, `action.yml`) — 6 phases via `switch` on `inputs.phase`: `discover`, `analyze`, `publish`, `remediate`, `observe`, `verify`. README's "Bot controller" section lists only 5 phases (discover/analyze/publish/verify/remediate-observe combined under "remediate / observe"); the code implements `observe` as its own distinct phase with its own inputs/outputs (`pull-request-number`, `head-sha`) separate from `remediate`.
- Library entry (`src/index.ts`) — re-exports domain types/functions for programmatic consumers per SPEC I4/I5 (`analyze`, `publish` as promise-returning functions), consistent with README/SPEC.
- Domain ports (`src/domain/ports.ts`) — SPEC I9 names exactly six external ports: `RepositorySource`, `Detector`, `EnrichmentProvider`, `GitHubGateway`, `Cache`, `Clock`. The code defines those six **plus a seventh**, `FindingVerificationGateway` (used by `verify`/`observe` flows to list/close Finding Issues), which is not named in SPEC I9 or docs/architecture.md's "External ports" section (both describe exactly six). This is a documentation/spec gap, not a code defect — the extra port is a legitimate, tested interface.
- Skill wrapper (`skills/techdebtter/SKILL.md`, `test/skills/techdebtter.test.ts`) — thin conversational wrapper delegating to the CLI, matching SPEC I10 and README's "Agent skill" section.

### Frameworks & Libraries
- TypeScript ^6.0.3 — language/compiler, strict mode, ES2024 target.
- Node.js >=22 (engines) — runtime; CI matrix tests 22 and 24 (`.github/workflows/ci.yml`), matching SPEC C4.
- commander ^15.0.0 — CLI argument parsing (`src/cli/main.ts`).
- @octokit/rest ^22.0.1, @octokit/auth-app ^8.3.1 — GitHub REST API + GitHub App auth (`src/adapters/github.ts`, `src/adapters/github-app-auth.ts`, `src/adapters/remediation-github.ts`).
- @actions/core ^3.0.1 — GitHub Actions input/output/logging (`src/action/main.ts`).
- ajv ^8.20.0 — JSON Schema validation for policy files (`src/domain/policy.ts` uses Ajv2020 against `schemas/policy.schema.json`).
- yaml ^2.9.0 — YAML parsing for `.techdebtter.yml` policy files.
- execa ^10.0.1 — subprocess execution (`src/adapters/process.ts`, used to invoke `git`/`trivy` and remediator ecosystem commands).
- tsup ^8.5.1 — build/bundling (esbuild-based).
- vitest ^4.1.11 — test runner (dev dependency).
- eslint ^10.9.1 + @eslint/js ^10.0.1 + typescript-eslint ^8.69.0 — linting.
- Trivy (external CLI, not an npm dependency) — vulnerability scanner invoked via subprocess; version-gated to `>=0.60.0 <1.0.0` (`src/adapters/trivy.ts` `MIN_VERSION`/`MAX_VERSION` constants), matching SPEC C5 and README's Prerequisites.
- CISA KEV catalog (`src/adapters/kev.ts`) and FIRST EPSS API (`src/adapters/epss.ts`) — external JSON feeds fetched via the global `fetch` port (`src/adapters/fetch.ts`), matching SPEC C5's "CISA KEV + FIRST EPSS enrichment".

### Test Coverage
- **Test Directories**: `test/action/`, `test/adapters/`, `test/application/`, `test/cli/`, `test/domain/`, `test/fixtures/`, `test/skills/` — 28 `*.test.ts` files mirroring the `src/` package structure 1:1 (e.g. `src/domain/criticality.ts` ↔ no direct `criticality.test.ts`, but `src/domain/triage.ts` ↔ `test/domain/triage.test.ts`; criticality logic is exercised indirectly through `triage.test.ts` and `analyze.test.ts`). Fixtures directory holds representative sample payloads: `test/fixtures/trivy/vulnerability.json`, `test/fixtures/kev/catalog.json`, `test/fixtures/epss/response.json`, `test/fixtures/github/issues.json`, `test/fixtures/npm/package.json` + `package-lock.json`, `test/fixtures/policy/organization.yml` + `repository.yml`, `test/fixtures/reports/v1.json`.
- **Test Frameworks**: Vitest ^4.1.11 (`vitest.config.ts` includes `test/**/*.test.ts`).
- **Coverage Config**: absent — `vitest.config.ts` sets only `test.include`; no `test.coverage` block, no coverage provider dependency (e.g. `@vitest/coverage-v8`) in `package.json` devDependencies, and no coverage threshold/gate anywhere in CI (`.github/workflows/ci.yml` runs `npm run check` and `npm run build` only — no `--coverage` flag, no coverage upload step). Confirmed against the session's earlier baseline run (`npx vitest run` → 28 files / 130 tests passing, no coverage reported).

### Code Quality Indicators
- **Linting**: ESLint 10 flat config (`eslint.config.js`) using `@eslint/js` recommended + `typescript-eslint` recommended, plus two custom rules (`consistent-type-imports` with inline fix style, `no-unused-vars` with `^_` ignore pattern). The `ignores` block lists `dist/**`, `node_modules/**`, `coverage/**`, and the three root config files, but carries **no top-level `files` scope** limiting the ruleset to `src/`/`test/` — only the third config object (rules block) is scoped via `files: ["src/**/*.ts", "test/**/*.ts"]`, but the earlier `eslint.configs.recommended`/`tseslint.configs.recommended` blocks apply unscoped. This is the previously-established finding: `npx eslint src test` is clean (product code), but a bare `eslint .` / `npm run check` also lints `.claude/tools/` (the AI-DLC harness's own TypeScript, outside `tsconfig.json`'s `include`), producing the reported 95 errors there — harness noise, not a product defect, not re-verified in this pass.
- **CI/CD**: `.github/workflows/ci.yml` — single `check` job, matrix over Node 22/24, steps: `actions/checkout` and `actions/setup-node` pinned to full commit SHAs (matches SPEC C6/V27 "external Actions use reviewed full commit SHAs" and README's controller guidance), `npm ci`, `npm run check` (lint+typecheck+test), `npm run build`, `test -f dist/action/main.js` (build-output smoke check), `npm pack --dry-run`. Runs on `push` to `main` and on `pull_request`, matching SPEC C10 "all deterministic tests/checks block main." No separate live/smoke-test workflow was found in `.github/workflows/` (only `ci.yml` exists) — SPEC C10 also calls for "live external smoke tests scheduled, non-blocking" and docs/architecture.md's "Implementation shape" section states "Live GitHub, CISA, and FIRST smoke tests run on a non-blocking schedule," but no such scheduled workflow file exists in `.github/workflows/`. This is a documentation/implementation gap worth flagging to the architect.
- **Documentation**: README.md, SPEC.md, CONTEXT.md, AGENTS.md, docs/architecture.md, docs/implementation-plan.md, docs/adr/0001–0007 (one-paragraph ADRs, Context/Decision format), docs/agents/ (domain.md, issue-tracker.md, triage-labels.md) all present and substantive. Inline code documentation is light (a handful of clarifying comments, e.g. `src/domain/criticality.ts` comments explaining the "never lower without explicit exposure evidence" rule) but the code is largely self-documenting via descriptive names and strict typing; no dedicated per-function JSDoc, but interfaces in `src/domain/model.ts` and `src/domain/ports.ts` carry targeted doc comments on the less-obvious fields (e.g. `Finding.packageEcosystem` "Present when Triage retained package remediation coordinates from Detections").

### Technical Debt Signals
- **README.md overstates detection scope vs. what `src/` implements** — README's opening paragraphs describe continuous evaluation across "dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, and repetitive code-quality issues" (8 categories). The actual `Detector` registration is single-purpose: `src/adapters/trivy.ts` (`TrivyVulnerabilityDetector`, `id = "trivy-vulnerability"`) is the only `Detector` implementation in `src/adapters/`, and `src/domain/policy.ts`'s `productDefaults.detectors` (`allowed`/`required`) lists only `["trivy-vulnerability"]`. The CLI's `capabilities --json` output (`src/cli/main.ts`) also reports `detectors: ["trivy-vulnerability"]`. SPEC.md C5 is explicit and accurate about this: "Initial tracer deterministic, local, LLM-free: Git + Trivy vulnerability scan + CISA KEV + FIRST EPSS." docs/architecture.md's "First tracer flow" section and README's own "Project status" line ("The first tracer slice delivers deterministic local vulnerability analysis and user-selected GitHub Finding Issue publication") agree with the code and with SPEC — only README's top-of-file marketing description is out of step with what ships. This is the central gap the architect and later stages need to resolve (correct README, not the code).
- **Remediation ecosystems are implemented beyond the vulnerability-only detection scope** — README's "Remediation (npm)" section says the npm remediator is the first code-changing remediator and additional static remediators "cover Python `requirements.txt`, Docker `FROM` tags, Ruby `Gemfile` pins, and Terraform `required_providers` versions," and this matches the code exactly: `src/adapters/remediators.ts`'s `createDefaultRemediators()` registers `NpmPackageLockRemediator`, `PythonRequirementsRemediator`, `DockerBaseImageRemediator`, `RubyGemfileRemediator`, `TerraformProviderRemediator` — all five exist and are tested (`test/adapters/npm-remediator.test.ts`, `test/adapters/ecosystem-remediators.test.ts`). Remediation is accurately documented; only the upstream *detection* claim (8 categories) is overstated, since all Findings that reach these remediators still originate from the single Trivy vulnerability detector.
- **`FindingVerificationGateway` (7th port) undocumented in SPEC/architecture** — `src/domain/ports.ts` defines 7 exported port interfaces (`RepositorySource`, `Detector`, `EnrichmentProvider`, `GitHubGateway`, `FindingVerificationGateway`, `Cache`, `Clock`) but SPEC I9 and docs/architecture.md's "External ports" section both say "six ports" and name only six, omitting `FindingVerificationGateway`. The port is real, used, and tested (`src/application/verify.ts`, `test/application/verify.test.ts`) — this is a docs-vs-code undercount, not a missing capability.
- **No scheduled/non-blocking smoke-test workflow found** — SPEC C10 and docs/architecture.md's "Implementation shape" both describe live GitHub/CISA/FIRST smoke tests running "on a non-blocking schedule," but `.github/workflows/` contains only `ci.yml` (push/PR-triggered, no `schedule:` trigger). No `schedule:`-triggered workflow exists anywhere in the repo. Either the smoke-test workflow was never implemented or lives outside this repository (e.g. in the private controller repo referenced by README's "Bot controller" section, which is out of scope for this checkout).
- **No coverage tooling/threshold configured** — `vitest.config.ts` has no `coverage` block and no coverage provider is a devDependency; `org.md`'s Testing Posture default (80% line-coverage floor for non-`poc`/`refactor`/`workshop` scopes) cannot currently be measured or enforced by this repo's own tooling. Not necessarily a defect for this pass's scope (bugfix/documentation-correction, not feature-building), but relevant context for future test-strategy stages.
- **`observe`/`verify` CLI subcommands undocumented in README's user-facing Usage section** — both exist, are implemented, and are tested (`test/cli/observe-verify.test.ts`), but README's "Usage" section (the section aimed at human CLI users) does not mention them; they only surface implicitly via the "Bot controller" phases list. Minor documentation completeness gap, separate from the detection-scope overstatement.
- **Minor duplication between `src/cli/bootstrap.ts` and `src/action/main.ts`'s `createAnalyzeDependencies`** — both independently wire `LocalGitRepositorySource`, `TrivyVulnerabilityDetector`, `CisaKevProvider`, `FirstEpssProvider` with slightly different cache paths and no shared factory; a low-risk, contained duplication rather than a functional defect.
- **No `TODO`/`FIXME`/`HACK` markers, no `eslint-disable` comments, and no `any`/`as any` usages found anywhere in `src/`** — a positive code-quality signal (strict TypeScript throughout, `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`/`noImplicitOverride` all enabled in `tsconfig.json`), included here because its absence is itself evidence relevant to the "repetitive code-quality issues" claim in README (there is little to no code-level rot to detect in this codebase, which is a separate observation from README's category-overstatement finding above).

## Handoff Summary
- **Intent-relevant finding**: README.md's opening description of TechDebtter's detection scope ("dependency drift, security-related upgrades, deprecated APIs, fragile tests, stale CI/CD workflows, infrastructure-as-code debt, documentation gaps, and repetitive code-quality issues" — 8 categories) is not implemented. The only registered `Detector` is `TrivyVulnerabilityDetector` (`src/adapters/trivy.ts`, `id: "trivy-vulnerability"`), confirmed by `productDefaults.detectors` in `src/domain/policy.ts` (`allowed`/`required` both `["trivy-vulnerability"]`) and by the CLI's own `capabilities --json` output in `src/cli/main.ts` (`detectors: ["trivy-vulnerability"]`). SPEC.md C5, docs/architecture.md's "First tracer flow," and README's own "Project status" line all correctly describe the delivered scope as deterministic Git + Trivy + CISA KEV + FIRST EPSS only — so this is specifically a README top-of-file overstatement, not a code defect and not a multi-document disagreement about SPEC/architecture/code (those three agree with each other and with the running tests). The five ecosystem remediators (npm/Python/Docker/Ruby/Terraform) that README describes in its "Remediation" section are, by contrast, fully implemented and match the code exactly.
- **Risks / follow-up**: (1) `src/domain/ports.ts` defines a 7th port, `FindingVerificationGateway`, not named by SPEC I9 or docs/architecture.md's six-port list — real and tested, just undercounted in docs. (2) SPEC C10 / docs/architecture.md describe a scheduled non-blocking live smoke-test workflow that does not exist in `.github/workflows/` (only `ci.yml`, push/PR-triggered) — may live in an out-of-scope private controller repo, or may be an undelivered doc claim; worth a explicit decision rather than silent correction, consistent with the project's learned practice of treating cross-document disagreements as human decisions. (3) No coverage tooling/threshold is configured in this repo (`vitest.config.ts` has no `coverage` block); the org's default 80% floor cannot be measured today. (4) README's "Usage" section omits the existing, tested `observe` and `verify` CLI subcommands. None of these four are blocking for the Requirements Analysis stage, but all four are facts the architect should carry into codekb rather than re-derive.
