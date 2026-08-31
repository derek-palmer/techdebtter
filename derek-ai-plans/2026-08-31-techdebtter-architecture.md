# TechDebtter First Tracer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver deterministic local vulnerability analysis and user-selected, idempotent GitHub Finding Issue publication.

**Architecture:** One TypeScript package exposes a deep `analyze`/`publish` Module and CLI. Local Git and Trivy produce a pinned Repository Snapshot and Detections; KEV/EPSS add facts; internal Triage produces a versioned Analysis Report; Octokit reconciles selected Findings to GitHub Issues.

**Tech Stack:** TypeScript ESM, Node.js 22+, npm, Commander, Execa, Ajv, YAML, Octokit, Vitest, ESLint, tsup, Trivy, GitHub CLI.

## Global Constraints

- One runtime-selected GitHub Organization per operation; never hard-code owner.
- Initial tracer deterministic, local, LLM-free: Git + Trivy vulnerability scan + CISA KEV + FIRST EPSS.
- First tracer ends after selected Finding Issues are reconciled; no repository code changes.
- GitHub Issues authoritative Finding backlog; local reports/caches disposable.
- No telemetry by default. Never upload source, secrets, credentials, or full raw detector output.
- TypeScript ESM, Node.js `>=22`, npm, committed `package-lock.json`; CI tests Node 22 + 24.
- Every deterministic PR check blocks merge to `main`; external live smoke tests remain scheduled and non-blocking.

---

## Status

Architecture interview complete. First-tracer plan ready for execution on `docs/techdebtter-architecture-spec`.

## Accepted architecture decisions

- Start with one GitHub organization at a time, selected at runtime rather than hard-coded.
- Support both a human User Identity and a semi-autonomous Bot Identity.
- Limit operation to the intersection of GitHub permissions and an explicit TechDebtter Operating Scope.
- Classify Findings as Technical Debt, Vulnerabilities, or Defects; use detector families and priority dimensions for further decomposition.
- Prefer deterministic Detectors such as Trivy where they exist, while allowing AI-backed Detectors for judgment-heavy conditions.
- Require every Finding to cite concrete Evidence; assumptions cannot become Findings.
- Apply a per-repository Remediation Budget so PR creation does not overwhelm maintainers.
- Enforce both concurrent-PR and PR-creation-cadence limits in the Remediation Budget.
- Allow an optional Repository Policy to customize cadence and PR creation; use safe defaults when it is absent.
- Resolve policy in layers: safe product defaults, Organization Policy defaults and hard ceilings, then Repository Policy values within those ceilings.
- Never allow repository-owned configuration to expand GitHub permissions or exceed Organization Policy ceilings.
- Load optional Repository Policy from a root `.techdebtter.yml`, validate it against a published JSON Schema, and use safe product or Organization Policy defaults when absent.
- Load optional Organization Policy from `ORG/.github/.techdebtter.yml` through an explicit TechDebtter lookup; GitHub does not natively inherit this custom file. Fall back to product defaults when it is absent, then merge a repository's root `.techdebtter.yml` within organization ceilings.
- Validate every present policy strictly against the published schema. Unknown keys, malformed values, or invalid safety limits stop the operation with precise errors; only an absent policy falls back to the next policy layer.
- Do not require a policy format version initially. Use Git history for change tracking, evolve the schema backward-compatibly, support an optional `$schema` URL for editor validation, and introduce explicit format versioning only when a genuinely breaking policy contract requires it.
- Resolve policy field by field rather than with a generic YAML deep merge: repository values may override organization defaults only within hard bounds, allowed Detectors intersect, organization-required Detectors cannot be disabled, exclusions accumulate to narrow scope, and other lists replace unless their schema explicitly defines different semantics.
- Distinguish an absent Organization Policy from an unverifiable one. Use product defaults only after confirming `ORG/.github` is readable and its `.techdebtter.yml` is absent; allow warned read-only analysis when policy cannot be verified, but block publication and autonomous Remediation until verification succeeds.
- Allow an authorized User Identity to grant an explicit, auditable, one-operation Policy Override; never allow a Bot Identity to override policy.
- Default the Bot Identity to one open TechDebtter PR per repository and no more than one new PR per 24 hours.
- Continue detection and Finding updates while the Remediation Budget is exhausted; open the highest-Criticality eligible remediation when capacity returns.
- Build the first vertical slice as a local CLI using the User Identity's existing GitHub credentials.
- Keep the core workflow independent of identity and invocation so a GitHub App can later invoke the same engine as a Bot Identity.
- Start the Bot as database-free, stateless GitHub Actions invoked on a schedule or manually. Authenticate each run with a short-lived GitHub App installation token scoped to explicitly permitted repositories, reconstruct current state from GitHub, and make reconciliation idempotent through fingerprints.
- Run the initial controller once per day and through manual `workflow_dispatch`; do not install push-triggered workflows in target repositories. Allow Repository Policy to request a slower cadence or exclusion and require any faster cadence to remain within Organization Policy ceilings.
- Keep GitHub Issues, PRs, labels, and hidden metadata authoritative; use Actions concurrency to avoid overlapping work, artifacts only for expiring diagnostics, and caches only for disposable Trivy, KEV, and EPSS acceleration. Every run must remain correct after cache or artifact loss.
- Defer a real-time webhook receiver and durable job infrastructure until latency or scale demonstrates the need; accept some repeated work to keep the initial one-organization Bot lightweight.
- Install the Bot workflow once in a private, tightly controlled controller repository for each organization instead of modifying every target repository. Keep schedules, organization selection, and GitHub App secret references there; have it consume the reusable TechDebtter action or CLI published by the product repository.
- Pin every external Action used by the privileged controller, including TechDebtter, to a reviewed full commit SHA. Deliver version updates through explicit reviewed PRs rather than mutable tags or automatic execution changes.
- Split Bot discovery, analysis, publication, and later Remediation into separate jobs with fresh short-lived tokens. Scope discovery to required organization metadata and `.github` policy reads, analysis to one target repository's read access, publication to issue and label writes, and Remediation to explicitly authorized content and PR writes; never expose write-capable tokens to Trivy or target-repository contents during analysis.
- Limit the first Trivy detector path to vulnerable dependencies and carry it through the complete workflow.
- Defer Trivy misconfiguration, secret, and license results until their distinct policy and data-handling requirements are designed.
- Keep Scan and Remediation as separate operations: Scan cannot modify target repositories or create GitHub artifacts; Remediation is explicitly authorized and write-capable.
- Treat raw Detector output as Detections, not Findings.
- Triage Detections for evidence, duplication, grouping, classification, Criticality, affected scope, and remediation shape.
- Make a Finding the independently actionable unit: group related Detections when one remediation resolves them, and create one GitHub Finding Issue per Finding in the affected repository.
- Use GitHub Issues as the authoritative Finding backlog; retain separate TechDebtter state only for transient or operational concerns.
- Do not require a durable local Finding store for the first CLI; any local scan payloads, report artifacts, or detector caches are disposable and must not compete with GitHub Issues.
- Treat `to-issues` as an optional agent-runtime integration, never a required TechDebtter dependency.
- For a complex selected Finding, emit a self-contained remediation plan; if `to-issues` is unavailable, ask the interactive user whether to install it through the supported upstream installer and never install it silently.
- When `to-issues` is installed, ensure its per-repository issue-tracker and label setup is present before handing it the remediation plan.
- If `to-issues` remains unavailable, publish the parent Finding Issue with its complete remediation plan, skip child-ticket decomposition, and preserve the Remediation Route chosen during Triage.
- In the first CLI workflow, analyze the selected scope, Triage the Detections, report the proposed Findings, accept user selections, then publish only the selected Findings to GitHub Issues.
- Make versioned JSON the canonical Analysis Report for agents and automation; derive the interactive terminal and optional Markdown renderings from the same model.
- Show a human-readable terminal report by default, provide stable selection IDs, support `--format json` and optional `--output <path>`, and write no report files into the analyzed repository by default.
- Exit successfully when `analyze` produces a valid report regardless of Finding Criticality. Provide an explicit enforcement option such as `--fail-on high`, reserve distinct nonzero codes for invalid input or policy, missing prerequisites, authentication, and operational failures, and keep machine-readable errors on `stderr` so JSON on `stdout` remains valid.
- End the first tracer slice after the User Identity selects proposed Findings and TechDebtter creates or reconciles their GitHub Finding Issues.
- Defer code-changing Remediation to a later vertical slice built on the proven analysis-to-issue workflow.
- For the first later code-changing slice, support direct dependency upgrades only for repositories using `package.json` with `package-lock.json`; prove deterministic manifest and lockfile updates, repository validation, evidence, rollback, and budget-controlled PR creation before broadening scope.
- Add Ruby, Terraform, Docker, and Python as explicit later Remediator ecosystems, each with its own evidence, mutation, validation, and rollback contract; expand to other npm-family lockfiles separately from the initial npm adapter.
- Treat target-repository commands as a trust boundary. In local User Identity mode, show the exact install, build, and test commands and run them only after explicit approval. In unattended Bot Identity mode, use static validation only and never execute target-repository code as part of TechDebtter's own worker.
- Have Bot Remediation open statically validated changes as draft PRs, rely on the repository's existing CI for executable builds and tests, and mark a draft ready for review only after all required checks pass. Preserve failed checks as Evidence and leave the PR in draft.
- Do not treat missing required checks as successful validation. Keep the Bot-authored PR in draft and route it to `ready-for-human`; permit static-only promotion later only through an explicit Organization Policy exception or manual authorized-user action.
- In the first Remediator, do not attempt autonomous CI repair. Keep the same failed PR in draft, attach check results and logs as Evidence, change its route to `ready-for-human`, and never open a replacement PR for that Finding. Defer AI repair loops until policy can opt in with a strict attempt limit.
- Treat a linked PR merge as a trigger for a new Scan, not proof of remediation. Close the Finding Issue as remediated only when the Finding is absent from the merged commit's Analysis Report; if verification cannot run or fails, leave the issue open and record verification as pending or failed.
- Use TypeScript on Node.js for both the initial CLI and future GitHub App so they share one typed domain and workflow implementation; keep Trivy behind a JSON Detector adapter.
- Put the core workflow behind a deep Module with `analyze(scope): AnalysisReport` and `publish(report, selections): PublicationResult`; keep the first operation repository-read-only and the second as the explicit GitHub write boundary.
- Make the CLI and future GitHub App delivery adapters over that interface, with Detector orchestration, Triage, grouping, Criticality, fingerprints, and reconciliation hidden inside.
- Define six external ports around the core: `RepositorySource` produces immutable Repository Snapshots, `Detector` produces evidence-backed Detections, `EnrichmentProvider` adds external facts, `GitHubGateway` reads policy and reconciles GitHub artifacts, `Cache` holds disposable acceleration data, and `Clock` makes time-dependent rules deterministic. Keep Triage, fingerprints, Criticality, policy resolution, and report generation internal.
- Default the first CLI to analyzing an existing local checkout (`techdebtter analyze .`), deriving its GitHub repository and exact commit SHA from Git.
- Defer remote repository acquisition to a later Bot adapter that fetches a shallow pinned Repository Snapshot only when the target SHA changes.
- Refuse dirty working trees by default; allow explicit `--include-uncommitted` analysis marked non-reproducible, but prohibit publishing its Findings until the changes are committed and reanalyzed.
- Reuse the active GitHub CLI account for the User Identity: verify it with `gh auth status`, obtain the token transiently with `gh auth token`, pass it only in memory to the GitHub adapter, and delegate missing authentication or account switching to `gh`.
- Treat Trivy as an external prerequisite: check it on `PATH`, verify and record its version, support a documented version range, provide installation guidance when missing, and never install it silently.
- Defer an optional container-based Trivy adapter until installation friction justifies a second production adapter.
- Keep the first tracer slice deterministic and fully usable without an LLM; introduce AI through an optional adapter later for judgment-heavy detection, contextual interpretation, complex grouping, and remediation planning.
- Disable telemetry by default and never upload repository source, secrets, credentials, or full raw Detector output. Require future AI adapters to be explicit policy opt-ins, send only the minimum redacted Evidence for a named task, and record provider, model, purpose, and evidence hashes in provenance without persisting sensitive prompt contents.
- Enrich Trivy vulnerability Detections through separate CISA KEV and FIRST EPSS adapters, recording source timestamps as Evidence.
- For a single-repository CLI run, query EPSS in small CVE batches and cache the CISA KEV JSON daily; move the organization-scale Bot to the EPSS daily bulk feed.
- Degrade through cached data or explicit unknown enrichment when a source is unavailable, reducing confidence without treating missing data as negative Evidence or failing the Analysis Report.
- Calculate vulnerability Criticality through explicit rules rather than a weighted score: confirmed relevant KEV is Critical; otherwise begin with authoritative severity, allow policy-threshold EPSS to raise one band, allow explained repository Evidence adjustments, and never let missing enrichment lower a band.
- Ship local agent skills as thin delivery adapters over the TechDebtter CLI. Keep commands, schemas, defaults, and validation in executable code; use skills for prerequisite checks, conversational reporting and selection, publication confirmation, and optional `to-issues` handoff.
- Ship one user-invoked `/techdebtter` skill initially, covering prerequisites, analysis, reporting, user selection, publication confirmation, and publication in one context while calling the CLI's separate `analyze` and `publish` operations.
- Add separate skills or a router only when genuinely independent workflows emerge.
- Package `skills/techdebtter/SKILL.md` for discovery by the skills.sh CLI and document both project-local installation (default) and user-level installation (`-g`), leaving scope and target agent selection to the user.
- Publish the TypeScript CLI as an npm package exposing a `techdebtter` binary; support project-pinned, user-level, and one-off `npx` use while keeping CLI installation separate and explicit from skill installation.
- Keep the initial implementation in one TypeScript package with internal `domain`, `application`, `adapters`, `cli`, and `action` directories plus root `schemas/` and `skills/techdebtter/`; publish the CLI and Action entrypoints together and split packages only when an independently versioned consumer requires it.
- Use npm with a committed `package-lock.json`, native ESM TypeScript, and a Node.js `>=22` engine floor. Test Node 22 and Node 24 in CI and target Node 24 for the published GitHub Action runtime.
- Require every PR to pass linting, type-checking, schema validation, domain unit tests, fixture-backed adapter contract tests, temporary-repository CLI integration tests, and package and Action build verification before merge to `main`; block direct pushes. Run live GitHub, CISA, and FIRST smoke tests on a schedule as non-blocking diagnostics while keeping their deterministic fixture equivalents mandatory.
- Deliver in proven vertical slices: (1) domain types, policy, fingerprints, Criticality, and report contracts; (2) local Git and Trivy analysis with KEV and EPSS; (3) interactive selection and idempotent Finding Issue publication; (4) the installable `/techdebtter` skill; (5) the database-free GitHub Actions controller; (6) npm and `package-lock.json` draft-PR Remediation with CI verification; then (7) Ruby, Terraform, Docker, Python, and opt-in AI adapters independently.
- Have the skill detect a compatible CLI and ask before offering installation or upgrade; never install executable dependencies silently.
- Prefer a repository-pinned CLI over a global installation and negotiate compatibility through `techdebtter capabilities --json`, checking required commands and Analysis Report schema versions while retaining semantic versions for diagnostics.
- Defer PyPI packaging until a concrete Python-native embedding, Detector SDK, notebook, or remote-client use case justifies a deep Python interface; use versioned JSON as the language-neutral contract meanwhile.
- Allow future Bot Identity issue creation only when evidence, confidence, and Organization or Repository Policy permit it.
- Default unattended Bot publication to evidence-verified Critical and High Vulnerabilities only. Keep Medium and Low results in the Analysis Report unless policy opts them in, and require each later Finding class to define its own explicit unattended-publication rule.
- Give each Finding a stable Finding Fingerprint and reconcile later Scans against its existing Finding Issue.
- Preserve source-specific Detection Fingerprints while using normalized, detector-independent Finding Fingerprints to converge equivalent results from multiple Detectors.
- Update open issues with new evidence, reopen remediated issues when the condition returns, preserve accepted or suppressed closures until expiry or materially different evidence, and create a new issue only for independently different remediation.
- Format each Finding Issue with a human-readable title and body, workflow labels, and a hidden versioned metadata block containing fingerprints, provenance, schema version, and reconciliation data.
- Own a minimal `techdebtter:*` label namespace, create labels lazily, and allow Repository Policy to map them to local repository conventions.
- Use the existing canonical triage roles for Remediation Route: `ready-for-agent` for fully specified autonomous work and `ready-for-human` for human implementation; retain `needs-triage` and `needs-info` for incomplete Triage.
- Treat `ready-for-agent` as Remediation Queue eligibility rather than an immediate trigger; policy, Effective Criticality, scheduling, and available Remediation Budget decide when work begins.
- Exclude `ready-for-human` Findings from autonomous remediation.
- Keep Change Risk independent of Remediation Route: breaking-change or refactor flags increase review scrutiny but do not automatically prevent agent implementation.
- Use this default lazy-created label set: `techdebtter`; one of `techdebtter:debt`, `techdebtter:vulnerability`, or `techdebtter:defect`; one of `techdebtter:critical`, `techdebtter:high`, `techdebtter:medium`, or `techdebtter:low`; optional `techdebtter:breaking-change` and `techdebtter:refactor`; and one canonical triage-route label.
- Do not add TechDebtter closure-outcome labels. Use native GitHub issue state and hidden metadata to distinguish merged Remediation from explicit Suppression during reconciliation.
- Interpret GitHub `not planned` closure as manual Suppression, recording actor and time and treating it as indefinite unless a CLI or Bot command supplies an expiry. Interpret `completed` closure as a remediation claim that the next Scan verifies, reopening the issue if its Finding remains.
- Express Criticality as Critical, High, Medium, or Low with visible contributing evidence; retain raw measures such as CVSS and EPSS without collapsing them into an opaque TechDebtter score.
- Preserve Calculated Criticality from Evidence and Effective Criticality used by the Remediation Queue; allow authorized maintainers to override the latter with actor, timestamp, and rationale.
- Surface new Evidence against an override without silently replacing the maintainer's Effective Criticality.
- Allow Criticality Overrides to expire; mark them stale when materially changed Evidence appears, preserve their audit history, notify maintainers, and use the new Calculated Criticality until reauthorized.
- Order the Remediation Queue by contextual Criticality rather than CVE or CVSS alone.
- Move a CISA Known Exploited Vulnerability to the front only after evidence confirms the affected component is present, relevant, and in scope.

## First-tracer file map

- `package.json`: package metadata, CLI binary, scripts, runtime/dev dependencies.
- `package-lock.json`: reproducible npm dependency graph.
- `tsconfig.json`: strict ESM compiler contract.
- `eslint.config.js`: source/test lint rules.
- `tsup.config.ts`: ESM library + executable build.
- `.github/workflows/ci.yml`: required Node 22/24 checks.
- `schemas/policy.schema.json`: strict Repository and Organization Policy schema.
- `schemas/analysis-report.schema.json`: canonical automation output schema.
- `src/domain/model.ts`: domain value types only.
- `src/domain/ports.ts`: six external ports.
- `src/domain/policy.ts`: defaults, validation, explicit layered resolution.
- `src/domain/fingerprint.ts`: stable Detection/Finding identity.
- `src/domain/criticality.ts`: explainable vulnerability rules.
- `src/domain/triage.ts`: Detection validation, grouping, Finding production.
- `src/application/analyze.ts`: read-only orchestration.
- `src/application/publish.ts`: selected Finding reconciliation orchestration.
- `src/adapters/git.ts`: pinned local Repository Snapshot.
- `src/adapters/trivy.ts`: Trivy prerequisite + JSON conversion.
- `src/adapters/kev.ts`: daily cached CISA KEV facts.
- `src/adapters/epss.ts`: batched FIRST EPSS facts.
- `src/adapters/github.ts`: policy reads, labels, Finding Issue reconciliation.
- `src/adapters/gh-auth.ts`: transient active GitHub CLI token.
- `src/adapters/fs-cache.ts`: disposable cache.
- `src/cli/main.ts`: `analyze`, `publish`, `capabilities` commands and exit mapping.
- `src/cli/render.ts`: terminal/Markdown views derived from Analysis Report.
- `skills/techdebtter/SKILL.md`: thin interactive CLI orchestration.
- `test/fixtures/`: fixed Git, Trivy, KEV, EPSS, policy, report, and GitHub payloads.
- `test/domain/`, `test/adapters/`, `test/application/`, `test/cli/`: required deterministic suites.

### Task 1: Package foundation and domain contracts

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `tsup.config.ts`
- Create: `src/index.ts`
- Create: `src/domain/model.ts`
- Create: `src/domain/ports.ts`
- Create: `test/domain/model.test.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `OperatingScope`, `RepositorySnapshot`, `Evidence`, `Detection`, `Finding`, `AnalysisReport`, `PublicationResult`, `RepositorySource`, `Detector`, `EnrichmentProvider`, `GitHubGateway`, `Cache`, `Clock`.

- [ ] **Step 1: Initialize package and install exact dependency set**

Run:

```bash
npm init -y
npm install @octokit/rest ajv commander execa yaml
npm install --save-dev @eslint/js @types/node eslint tsup typescript typescript-eslint vitest
```

Edit `package.json` to expose `dist/cli/main.js` as `techdebtter`, set `type` to `module`, set `engines.node` to `>=22`, include `dist`, `schemas`, and `skills` in published files, and define `build`, `lint`, `typecheck`, `test`, and `check` scripts. Run `npm install` once more to synchronize `package-lock.json`.

- [ ] **Step 2: Write failing domain serialization test**

```ts
import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "../../src/domain/model.js";

describe("AnalysisReport", () => {
  it("preserves schema version and reproducible snapshot identity", () => {
    const report = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-31T00:00:00.000Z",
      reproducible: true,
      snapshot: { owner: "acme", repo: "api", commitSha: "a".repeat(40), dirty: false },
      policy: { verified: true, sources: ["product-defaults"] },
      findings: [],
      warnings: [],
    } satisfies AnalysisReport;
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });
});
```

- [ ] **Step 3: Verify missing contract fails**

Run: `npm test -- test/domain/model.test.ts`

Expected: FAIL because `src/domain/model.ts` does not exist.

- [ ] **Step 4: Add strict domain types and ports**

Define discriminated unions with these exact stable fields:

```ts
export type Criticality = "critical" | "high" | "medium" | "low";
export type FindingClass = "vulnerability" | "debt" | "defect";
export type RemediationRoute = "needs-triage" | "needs-info" | "ready-for-agent" | "ready-for-human";

export interface RepositorySnapshot {
  owner: string;
  repo: string;
  commitSha: string;
  dirty: boolean;
}

export interface OperatingScope {
  organization: string;
  repositories: string[];
  localPath: string;
  includeUncommitted: boolean;
}

export interface Evidence {
  kind: "repository" | "detector" | "severity" | "kev" | "epss" | "validation";
  source: string;
  observedAt: string;
  subject: string;
  value: string | number | boolean;
  url?: string;
}

export interface Detection {
  fingerprint: string;
  detector: string;
  detectorVersion: string;
  class: FindingClass;
  packageEcosystem: string;
  packageName: string;
  installedVersion: string;
  fixedVersions: string[];
  vulnerabilityIds: string[];
  target: string;
  severity: "unknown" | "negligible" | "low" | "medium" | "high" | "critical";
  evidence: Evidence[];
}

export interface Finding {
  selectionId: string;
  fingerprint: string;
  detectionFingerprints: string[];
  class: FindingClass;
  title: string;
  calculatedCriticality: Criticality;
  effectiveCriticality: Criticality;
  criticalityReasons: string[];
  route: RemediationRoute;
  evidence: Evidence[];
}

export interface AnalysisReport {
  schemaVersion: "1.0.0";
  generatedAt: string;
  reproducible: boolean;
  snapshot: RepositorySnapshot;
  policy: { verified: boolean; sources: string[] };
  findings: Finding[];
  warnings: string[];
  reportHash?: string;
}

export interface PublicationResult {
  published: Array<{
    selectionId: string;
    issueNumber: number;
    issueUrl: string;
    action: "created" | "updated" | "reopened" | "suppressed";
  }>;
  warnings: string[];
}
```

Define ports with these signatures and export public contracts from `src/index.ts`:

```ts
export interface RepositorySource {
  snapshot(scope: OperatingScope): Promise<RepositorySnapshot>;
}

export interface Detector {
  readonly id: string;
  detect(snapshot: RepositorySnapshot, root: string): Promise<Detection[]>;
}

export interface EnrichmentProvider {
  readonly id: string;
  enrich(detections: Detection[]): Promise<{ evidenceByVulnerability: Map<string, Evidence[]>; warnings: string[] }>;
}

export interface GitHubGateway {
  readOrganizationPolicy(owner: string): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }>;
  readRepositoryPolicy(snapshot: RepositorySnapshot): Promise<{ state: "present" | "absent" | "unverifiable"; text?: string }>;
  reconcileFinding(snapshot: RepositorySnapshot, finding: Finding, reportHash: string): Promise<PublicationResult["published"][number]>;
}

export interface Cache {
  get(key: string): Promise<{ storedAt: string; value: string } | undefined>;
  set(key: string, value: string, storedAt: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}
```

- [ ] **Step 5: Add build/lint/test configuration and CI**

Configure strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: "Bundler"`), flat ESLint, tsup ESM output with executable banner, and CI matrix `[22, 24]`. Each CI job runs `npm ci` then `npm run check`; build verification runs `npm pack --dry-run` after `npm run build`.

- [ ] **Step 6: Verify foundation**

Run: `npm run check && npm run build && npm pack --dry-run`

Expected: all commands exit 0; tarball contains `dist`, `schemas`, and `skills` only from product assets.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json eslint.config.js tsup.config.ts src test .github/workflows/ci.yml
git commit -m "feat: establish techdebtter domain contracts"
```

### Task 2: Strict layered policy

**Files:**
- Create: `schemas/policy.schema.json`
- Create: `src/domain/policy.ts`
- Create: `test/fixtures/policy/organization.yml`
- Create: `test/fixtures/policy/repository.yml`
- Create: `test/domain/policy.test.ts`
- Modify: `src/domain/model.ts`

**Interfaces:**
- Consumes: `Criticality` from Task 1.
- Produces: `ProductDefaults`, `OrganizationPolicy`, `RepositoryPolicy`, `EffectivePolicy`, `validatePolicy(text, kind)`, `resolvePolicy(product, organization, repository)`.

- [ ] **Step 1: Write failing policy behavior tests**

Cover these exact cases: absent layers use product defaults; unknown key fails; repo cannot raise `maxOpenPullRequests`; detector allowlists intersect; org-required Detector survives repo selection; exclusions union; unverifiable org policy sets `publicationAllowed=false`; `$schema` accepted; no `schemaVersion` required.

```ts
expect(resolvePolicy(defaults, org, repo)).toMatchObject({
  detectors: { enabled: ["trivy-vulnerability"] },
  scan: { intervalHours: 48 },
  publication: { unattendedMinimumCriticality: "high", allowed: true },
  remediation: { enabled: false, maxOpenPullRequests: 1, minHoursBetweenPullRequests: 24 },
  scope: { exclusions: ["vendor/**", "fixtures/**"] },
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- test/domain/policy.test.ts`

Expected: FAIL because policy schema/resolver do not exist.

- [ ] **Step 3: Define strict v1 schemas and defaults**

Use JSON Schema Draft 2020-12 with `additionalProperties: false` on every object. Define product defaults:

```ts
export const productDefaults: ProductDefaults = {
  detectors: { allowed: ["trivy-vulnerability"], required: ["trivy-vulnerability"] },
  scan: { enabled: true, intervalHours: 24 },
  publication: { unattendedMinimumCriticality: "high" },
  vulnerability: { epssRaiseThreshold: null },
  remediation: {
    enabled: false,
    maxOpenPullRequests: 1,
    minHoursBetweenPullRequests: 24,
    allowStaticOnlyPromotion: false,
  },
  scope: { exclusions: [] },
};
```

Organization Policy contains `defaults`, `ceilings`, `allowedDetectors`, `requiredDetectors`, and exclusions. Repository Policy contains requested scan/publication/vulnerability/remediation values, enabled Detectors, exclusions, and semantic label mappings. Represent unverifiable Organization Policy separately from absence.

- [ ] **Step 4: Implement field-specific resolution**

Ajv validates parsed YAML. Resolution clamps numeric repository values to organization ceilings, intersects Detector selection, retains required Detectors, unions exclusions, replaces label maps, and sets publication/remediation eligibility false when Organization Policy is unverifiable.

- [ ] **Step 5: Verify schema and resolution**

Run: `npm test -- test/domain/policy.test.ts && npm run typecheck`

Expected: PASS; invalid fixture errors include JSON pointer and rejected key.

- [ ] **Step 6: Commit**

```bash
git add schemas/policy.schema.json src/domain/policy.ts src/domain/model.ts test/fixtures/policy test/domain/policy.test.ts
git commit -m "feat: resolve strict layered policy"
```

### Task 3: Fingerprints, Criticality, and Triage

**Files:**
- Create: `src/domain/fingerprint.ts`
- Create: `src/domain/criticality.ts`
- Create: `src/domain/triage.ts`
- Create: `test/domain/fingerprint.test.ts`
- Create: `test/domain/criticality.test.ts`
- Create: `test/domain/triage.test.ts`

**Interfaces:**
- Consumes: `Detection`, `Evidence`, `EffectivePolicy`.
- Produces: `detectionFingerprint(input)`, `findingFingerprint(input)`, `calculateVulnerabilityCriticality(detection, enrichment, policy)`, `triage(detections, context)`.

- [ ] **Step 1: Write canonical fingerprint tests**

Assert ordering/case noise does not change identity, Detector name affects Detection Fingerprint, Detector name does not affect Finding Fingerprint, and different remediation targets do not collide.

```ts
expect(findingFingerprint({
  owner: "acme",
  repo: "api",
  packageEcosystem: "npm",
  packageName: "lodash",
  vulnerabilityIds: ["CVE-2026-0002", "CVE-2026-0001"],
  fixedVersions: ["4.17.22"],
})).toBe(findingFingerprint({
  owner: "ACME",
  repo: "api",
  packageEcosystem: "npm",
  packageName: "lodash",
  vulnerabilityIds: ["cve-2026-0001", "cve-2026-0002"],
  fixedVersions: ["4.17.22"],
}));
```

- [ ] **Step 2: Write Criticality table tests**

Use table cases: relevant KEV -> Critical; CVSS Critical without KEV -> High product band; enabled EPSS threshold may raise one band; missing KEV/EPSS never lowers; repository exposure adjustment includes exact reason. Set default EPSS promotion disabled through `null`.

- [ ] **Step 3: Write Triage grouping tests**

Assert equivalent Trivy Detections converge into one Finding, every Finding retains all Detection Fingerprints and Evidence, missing concrete Evidence routes `needs-info`, and complete deterministic vulnerability routes `ready-for-agent` without initiating Remediation.

- [ ] **Step 4: Verify tests fail**

Run: `npm test -- test/domain/fingerprint.test.ts test/domain/criticality.test.ts test/domain/triage.test.ts`

Expected: FAIL because domain functions do not exist.

- [ ] **Step 5: Implement pure domain functions**

Canonicalize strings to lowercase, trim whitespace, sort/dedupe sets, serialize fixed key order, and hash with SHA-256. Return Criticality as `{ calculated, reasons }`; Triage assigns stable selection IDs as first 12 hex characters of Finding Fingerprint and sorts Criticality then fingerprint for deterministic output.

- [ ] **Step 6: Verify domain behavior**

Run: `npm test -- test/domain && npm run typecheck`

Expected: PASS with no network/process calls.

- [ ] **Step 7: Commit**

```bash
git add src/domain/fingerprint.ts src/domain/criticality.ts src/domain/triage.ts test/domain
git commit -m "feat: triage evidence into stable findings"
```

### Task 4: Local Git and Trivy adapters

**Files:**
- Create: `src/adapters/git.ts`
- Create: `src/adapters/trivy.ts`
- Create: `test/fixtures/trivy/vulnerability.json`
- Create: `test/adapters/git.test.ts`
- Create: `test/adapters/trivy.test.ts`

**Interfaces:**
- Produces: `LocalGitRepositorySource`, `TrivyVulnerabilityDetector` implementing Task 1 ports.

- [ ] **Step 1: Write failing Git adapter tests**

Create temporary Git repositories in tests. Assert origin formats `git@github.com:OWNER/REPO.git` and `https://github.com/OWNER/REPO.git` normalize identically; SHA is 40 lowercase hex; dirty state uses `git status --porcelain=v1 -z`; missing origin and non-Git paths return typed prerequisite errors.

- [ ] **Step 2: Write failing Trivy adapter tests**

Inject a fake process runner. Assert commands are exactly `trivy --version` then `trivy fs --format json --scanners vuln --quiet <root>`, supported version is `>=0.60.0 <1.0.0`, exit errors preserve redacted stderr, and the fixture maps each vulnerability to a Detection with file target, package, installed/fixed versions, IDs, severity, Detector version, and raw-result hash Evidence.

- [ ] **Step 3: Verify tests fail**

Run: `npm test -- test/adapters/git.test.ts test/adapters/trivy.test.ts`

Expected: FAIL because adapters do not exist.

- [ ] **Step 4: Implement adapters through injected process runner**

Use Execa only behind:

```ts
export interface ProcessRunner {
  run(command: string, args: string[], options?: { cwd?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}
```

Never invoke package managers or repository scripts. Parse Trivy stdout as JSON; do not persist raw output.

- [ ] **Step 5: Verify adapters**

Run: `npm test -- test/adapters && npm run lint`

Expected: PASS; tests execute Git but use fake Trivy.

- [ ] **Step 6: Commit**

```bash
git add src/adapters/git.ts src/adapters/trivy.ts test/fixtures/trivy test/adapters
git commit -m "feat: detect vulnerabilities in local snapshots"
```

### Task 5: KEV and EPSS enrichment

**Files:**
- Create: `src/adapters/fs-cache.ts`
- Create: `src/adapters/kev.ts`
- Create: `src/adapters/epss.ts`
- Create: `test/fixtures/kev/catalog.json`
- Create: `test/fixtures/epss/response.json`
- Create: `test/adapters/enrichment.test.ts`

**Interfaces:**
- Consumes: `EnrichmentProvider`, `Cache`, `Clock`.
- Produces: `CisaKevProvider`, `FirstEpssProvider`, `FileSystemCache`.

- [ ] **Step 1: Write failing enrichment tests**

Assert CISA feed URL is `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`; cache key includes source/date; cache younger than 24h avoids fetch; EPSS URL batches sorted unique CVEs through `https://api.first.org/data/v1/epss?cve=`; timestamps and source URLs become Evidence; fetch failure uses valid cache; no cache yields explicit unknown warning and no negative Evidence.

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- test/adapters/enrichment.test.ts`

Expected: FAIL because enrichment adapters do not exist.

- [ ] **Step 3: Implement fetch/cache adapters**

Inject `fetch`, `Cache`, and `Clock`. Store only source payload, fetched timestamp, and content hash. Validate response shape before cache write. Bound EPSS batches to 100 CVE IDs and merge results by CVE.

- [ ] **Step 4: Verify degraded operation**

Run: `npm test -- test/adapters/enrichment.test.ts`

Expected: PASS for live-shaped fixture, cached fallback, and unknown fallback.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fs-cache.ts src/adapters/kev.ts src/adapters/epss.ts test/fixtures/kev test/fixtures/epss test/adapters/enrichment.test.ts
git commit -m "feat: enrich vulnerabilities with kev and epss"
```

### Task 6: Read-only analyze workflow and CLI

**Files:**
- Create: `schemas/analysis-report.schema.json`
- Create: `src/application/analyze.ts`
- Create: `src/cli/main.ts`
- Create: `src/cli/render.ts`
- Create: `test/application/analyze.test.ts`
- Create: `test/cli/analyze.test.ts`
- Create: `test/fixtures/reports/v1.json`

**Interfaces:**
- Consumes: Tasks 1-5 contracts/adapters.
- Produces: `analyze(scope): Promise<AnalysisReport>`, `runCli(argv, dependencies)`, `renderTerminal(report)`, `renderMarkdown(report)`.

- [ ] **Step 1: Write failing orchestration tests**

Assert order Snapshot -> policy -> Detector -> enrichment -> Triage -> report; dirty Snapshot refuses by default; `includeUncommitted` marks report non-reproducible; Organization Policy unverifiable adds warning; Finding ordering/selection IDs are stable; no GitHub write method is reachable from `analyze` dependencies.

- [ ] **Step 2: Write failing CLI tests**

Assert default terminal output, `--format json` emits only schema-valid JSON on stdout, `--format markdown`, `--output` writes only requested path, Findings exit 0, `--fail-on high` returns enforcement code, and operational errors write structured stderr without partial JSON stdout.

- [ ] **Step 3: Verify tests fail**

Run: `npm test -- test/application/analyze.test.ts test/cli/analyze.test.ts`

Expected: FAIL because workflow/CLI do not exist.

- [ ] **Step 4: Define Analysis Report schema**

Require schema version, generation time, reproducibility, Snapshot, resolved policy provenance, Findings, Evidence, warnings, Detector versions, enrichment timestamps, and report SHA-256. Set `additionalProperties: false`; validate the committed fixture with Ajv in tests.

- [ ] **Step 5: Implement workflow and renderers**

Keep orchestration dependency-injected. Renderers consume only `AnalysisReport`. Compute report hash over canonical JSON excluding the hash field. Map exit codes: `0` success, `2` invalid input/policy, `3` prerequisite/auth, `4` operational, `10` explicit `--fail-on` threshold reached.

- [ ] **Step 6: Verify end-to-end analysis with fake Trivy/network**

Run: `npm test -- test/application test/cli/analyze.test.ts && npm run check && npm run build`

Expected: PASS; fixture report validates; stdout snapshots stable.

- [ ] **Step 7: Commit**

```bash
git add schemas/analysis-report.schema.json src/application/analyze.ts src/cli test/application test/cli test/fixtures/reports
git commit -m "feat: analyze repositories into versioned reports"
```

### Task 7: GitHub authentication and Finding Issue reconciliation

**Files:**
- Create: `src/adapters/gh-auth.ts`
- Create: `src/adapters/github.ts`
- Create: `src/application/publish.ts`
- Create: `test/fixtures/github/issues.json`
- Create: `test/adapters/github.test.ts`
- Create: `test/application/publish.test.ts`

**Interfaces:**
- Consumes: `AnalysisReport`, selected IDs, `GitHubGateway`.
- Produces: `activeGhToken()`, `OctokitGitHubGateway`, `publish(report, selections): Promise<PublicationResult>`.

- [ ] **Step 1: Write failing auth tests**

Inject `ProcessRunner`; require `gh auth status` before `gh auth token`; trim token; never include token in error objects, logs, snapshots, or child-process arguments after retrieval.

- [ ] **Step 2: Write failing issue renderer/reconciliation tests**

Assert title/body/labels match architecture; metadata is one HTML comment containing schema version, report SHA, Snapshot SHA, Finding/Detection Fingerprints, provenance, and suppression state; existing open fingerprint updates; `completed` recurring issue reopens; `not planned` remains suppressed; unrelated remediation creates issue; lazy label creation is idempotent.

- [ ] **Step 3: Write failing publication-boundary tests**

Reject unknown selection IDs, duplicates, non-reproducible reports, report schema failure, unverified Organization Policy, and owner/repo outside requested Operating Scope. Assert only selected Findings reach `GitHubGateway` and retries return the same issue numbers.

- [ ] **Step 4: Verify tests fail**

Run: `npm test -- test/adapters/github.test.ts test/application/publish.test.ts`

Expected: FAIL because publication components do not exist.

- [ ] **Step 5: Implement GitHub adapter and publication**

Use Octokit pagination to list issues labeled `techdebtter`, parse only valid hidden metadata, reconcile by Finding Fingerprint, and create missing semantic labels. Never infer identity from title. Keep issue writes behind `publish`; preserve suppressed issue audit and material-Evidence comparison.

- [ ] **Step 6: Verify idempotency and token redaction**

Run: `npm test -- test/adapters/github.test.ts test/application/publish.test.ts`

Expected: PASS; two identical publish calls produce one create then one no-op/update against same issue.

- [ ] **Step 7: Commit**

```bash
git add src/adapters/gh-auth.ts src/adapters/github.ts src/application/publish.ts test/fixtures/github test/adapters/github.test.ts test/application/publish.test.ts
git commit -m "feat: reconcile selected findings to github issues"
```

### Task 8: Publish/capabilities CLI and full tracer acceptance

**Files:**
- Modify: `src/cli/main.ts`
- Create: `test/cli/publish.test.ts`
- Create: `test/cli/capabilities.test.ts`
- Create: `test/cli/tracer.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: `techdebtter publish <report> --select <id...>`, `techdebtter capabilities --json`.

- [ ] **Step 1: Write failing CLI boundary tests**

Assert `publish` requires explicit IDs, summarizes intended issue writes before confirmation in interactive mode, supports `--yes` only for already explicit selections, returns JSON PublicationResult under `--format json`, and never offers a dirty report. Assert capabilities includes CLI semantic version, supported report schema versions, commands, Detectors, and publication support.

- [ ] **Step 2: Write failing full tracer test**

Use a temporary Git repo, fake Trivy executable, fake fetch, and local HTTP GitHub fake. Execute built CLI `analyze --format json --output <temp>/report.json`, extract selection ID, execute `publish ... --select <id> --yes`, then repeat publish. Assert one Finding Issue exists and second run reconciles it.

- [ ] **Step 3: Verify tests fail**

Run: `npm test -- test/cli/publish.test.ts test/cli/capabilities.test.ts test/cli/tracer.test.ts`

Expected: FAIL because commands are incomplete.

- [ ] **Step 4: Implement commands and README usage**

Wire Task 7 publication; validate report before showing selections; display exact target repository and issue actions before confirmation. Document prerequisite checks, local install, `npx`, analyze/report/select/publish flow, exit codes, and non-reproducible restriction.

- [ ] **Step 5: Verify full tracer and package**

Run: `npm run check && npm run build && npm pack --dry-run`

Expected: all required checks pass; tracer test proves read-only analysis plus idempotent selected publication.

- [ ] **Step 6: Commit**

```bash
git add src/cli test/cli README.md
git commit -m "feat: complete local analysis to issue tracer"
```

### Task 9: Installable `/techdebtter` skill

**Files:**
- Create: `skills/techdebtter/SKILL.md`
- Create: `test/skills/techdebtter.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `techdebtter capabilities --json`, `analyze`, `publish`.
- Produces: user-invoked skill installable with `npx skills add OWNER/techdebtter --skill techdebtter` and optional `-g`/`--agent` flags.

- [ ] **Step 1: Write failing skill contract test**

Parse frontmatter and assert name `techdebtter`; user invocation only; calls `capabilities --json`; prefers project-pinned CLI; asks before CLI install/upgrade; verifies `gh`/Trivy; analyzes before selection; confirms explicit selection before publication; offers but never auto-installs `to-issues`; contains no duplicated policy defaults or report schema.

- [ ] **Step 2: Verify test fails**

Run: `npm test -- test/skills/techdebtter.test.ts`

Expected: FAIL because skill does not exist.

- [ ] **Step 3: Write thin skill and installation docs**

Keep `SKILL.md` procedural: prerequisites -> capability negotiation -> analyze -> render Findings -> collect stable IDs -> confirm target/actions -> publish -> optional complex-plan handoff. Document project-local and global skills.sh commands and agent selection.

- [ ] **Step 4: Final deterministic verification**

Run: `npm run check && npm run build && npm pack --dry-run && git diff --check`

Expected: all commands exit 0; skill contract passes; package includes skill; no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add skills/techdebtter test/skills README.md
git commit -m "feat: add techdebtter agent skill"
```

## Subsequent slice plans

After Task 9 passes on `main`, write separate execution plans for:

1. database-free controller repository workflow and GitHub App phase-scoped tokens;
2. npm/`package-lock.json` Remediator, draft PR lifecycle, CI observation, and post-merge verification;
3. Ruby, Terraform, Docker, and Python Remediator adapters, one independently testable ecosystem per plan; and
4. opt-in AI Detector/planning adapters with privacy and provenance contract tests.

## Architecture worklog wrap-up

- Outcome: accepted architecture distilled into `SPEC.md`, `docs/architecture.md`, `CONTEXT.md`, ADRs, and this first-tracer plan.
- Validation: on `docs/techdebtter-architecture-spec`, `git diff --check` passed; all README targets exist; required §G/§C/§I/§V/§T/§B sections and Tasks 1-9 are present; trailing-whitespace and forbidden-placeholder scans returned no matches. No implementation test suite exists yet, so no code tests were run.
- Follow-up: invoke build explicitly to execute Task 1; do not auto-build from this planning session.
