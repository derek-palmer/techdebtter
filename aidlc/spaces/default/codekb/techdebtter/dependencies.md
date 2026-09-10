# Dependencies — TechDebtter

Versions and per-library purpose are catalogued in `technology-stack.md`; this file covers dependency *relationships* — which component consumes which external dependency, and how internal components depend on each other.

## External Dependency → Consuming Component

| External dependency | Consuming component(s) |
|---|---|
| commander | CLI |
| @octokit/rest, @octokit/auth-app | GitHub Integration Adapters |
| @actions/core | GitHub Action Controller |
| ajv | Domain Model & Policy |
| yaml | Domain Model & Policy |
| execa | GitHub Integration Adapters (git), Detection & Enrichment Adapters (trivy), Ecosystem Remediator Adapters, Infrastructure Adapters (process runner) |
| Trivy (external CLI) | Detection & Enrichment Adapters |
| CISA KEV feed, FIRST EPSS API | Detection & Enrichment Adapters |

No dependency is shared outside its documented consumer(s) in a way that crosses a port boundary improperly (e.g. `execa` is only ever reached through `src/adapters/process.ts`, not called directly from `application/` or `domain/`).

## Internal Cross-Component Dependencies

Directionality follows the hexagonal layering in `architecture.md`'s Component Relationships diagram:

- **CLI**, **GitHub Action Controller**, **Library Entry Point** → **Application Use-Cases** (each is an independent entry point wiring the same use-cases).
- **Application Use-Cases** → **Domain Model & Policy**, **GitHub Integration Adapters**, **Detection & Enrichment Adapters**, **Ecosystem Remediator Adapters**, **Infrastructure Adapters**.
- **GitHub Integration Adapters**, **Detection & Enrichment Adapters**, **Ecosystem Remediator Adapters** → **Domain Model & Policy** (port contracts) and **Infrastructure Adapters** (process execution / fetch / cache primitives).
- **Agent Skill Wrapper** → **CLI** (delegates entirely; no other component calls into it).
- **Domain Model & Policy** has no outward dependency on any other internal component — it is the innermost layer.

## Known Internal Duplication

`src/cli/bootstrap.ts` and `src/action/main.ts`'s `createAnalyzeDependencies` each independently construct the same adapter set (`LocalGitRepositorySource`, `TrivyVulnerabilityDetector`, `CisaKevProvider`, `FirstEpssProvider`, `OctokitGitHubGateway`, `OctokitRemediationGateway`, `FileSystemCache`) with slightly different cache paths, rather than sharing one factory. Low-risk, contained duplication — see `architecture.md` Improvement Opportunities.

## Build-Time Dependency Bundling

The GitHub Action build target (`tsup.config.ts`, `noExternal: [/.*/]`) inlines every runtime dependency into `action/main.js`, so the Action has no external dependency resolution step at execution time (no `npm install` required by consumers of the Action).

## Test Fixtures as Dependency Surrogates

`test/fixtures/` provides representative sample payloads standing in for each external dependency during tests: `trivy/vulnerability.json`, `kev/catalog.json`, `epss/response.json`, `github/issues.json`, `npm/package.json` + `package-lock.json`, `policy/organization.yml` + `repository.yml`, `reports/v1.json` — avoiding live network/subprocess calls in the 28-file, 130-test Vitest suite.
