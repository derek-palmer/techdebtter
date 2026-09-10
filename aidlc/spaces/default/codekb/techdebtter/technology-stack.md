# Technology Stack — TechDebtter

## Language & Runtime

- TypeScript ^6.0.3 — strict mode, ES2024 target, `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`/`noImplicitOverride` enabled (`tsconfig.json`).
- Node.js >=22 (`package.json` engines) — CI matrix tests Node 22 and 24 (`.github/workflows/ci.yml`), matching SPEC C4.
- ESM (`"type": "module"`).

## Build & Tooling

- tsup ^8.5.1 (esbuild-based) — bundles three targets: library (`index.js` + `.d.ts`), CLI (`cli/main.js` + `cli/bootstrap.js`, shebang banner), Action (`action/main.js`, `noExternal: [/.*/]` — all dependencies inlined).
- `tsc --noEmit` — type-checking (`npm run typecheck`).
- ESLint ^10.9.1 + @eslint/js ^10.0.1 + typescript-eslint ^8.69.0 — linting (`eslint.config.js`, flat config).
- Vitest ^4.1.11 — test runner (`vitest.config.ts`).

## Runtime Libraries

| Library | Version | Purpose |
|---|---|---|
| commander | ^15.0.0 | CLI argument parsing |
| @octokit/rest | ^22.0.1 | GitHub REST API client |
| @octokit/auth-app | ^8.3.1 | GitHub App authentication |
| @actions/core | ^3.0.1 | GitHub Actions input/output/logging |
| ajv | ^8.20.0 | JSON Schema validation (Ajv2020, policy files) |
| yaml | ^2.9.0 | `.techdebtter.yml` policy file parsing |
| execa | ^10.0.1 | Subprocess execution (git, trivy, remediator ecosystem commands) |

## External CLI / Services (not npm dependencies)

- **Trivy** — vulnerability scanner invoked via subprocess; version-gated `>=0.60.0 <1.0.0` (`src/adapters/trivy.ts` `MIN_VERSION`/`MAX_VERSION`), matching SPEC C5 and README's Prerequisites.
- **CISA KEV catalog** — external JSON feed fetched via the global `fetch` port (`src/adapters/kev.ts`).
- **FIRST EPSS API** — external JSON feed fetched via the global `fetch` port (`src/adapters/epss.ts`).

## CI/CD

- GitHub Actions — `.github/workflows/ci.yml`, single `check` job, Node 22/24 matrix, `actions/checkout`/`actions/setup-node` pinned to full commit SHAs (SPEC C6/V27).

Full dependency version-to-purpose-to-consumer mapping is in `dependencies.md`; this file is the canonical stack/version reference.
