# Build and Test — Build Instructions

## Sources

- `package.json`, `tsup.config.ts`
- `construction/code-generation/code-summary.md`

## Dependency Installation

```bash
npm install
```

No new dependencies were added this pass (`requirements.md` NFR2 forbids a
dependency-set change; confirmed via `git status` on `package.json`/
`package-lock.json` during Code Generation review).

## Environment Setup

No new environment variables, config files, or local services are required.
Existing prerequisites unchanged: Node.js >=22, Trivy CLI `>=0.60.0 <1.0.0`
on PATH for live `analyze` runs (not required for the test suite, which
stubs the `Detector` port).

## Build Commands

```bash
npm run build
```

Runs `tsup`, producing three targets: `dist/index.js` (library, + `.d.ts`),
`dist/cli/main.js` + `dist/cli/bootstrap.js` (CLI), `dist/action/main.js`
(GitHub Action, dependency-inlined).

## Build Verification

Confirmed 2026-09-10: `npm run build` completes successfully — all three
`tsup` targets built (ESM + DTS), no errors.

## Troubleshooting

No build issues encountered this pass. `src/wiring/dependency-wiring.ts` is
a new module with no special build configuration needed — it follows the
existing `src/` module pattern and is picked up by the existing `tsup`
entry-point configuration automatically.
