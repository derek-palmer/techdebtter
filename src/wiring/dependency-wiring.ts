import { LocalGitRepositorySource } from "../adapters/git.js";
import { FileSystemCache } from "../adapters/fs-cache.js";
import { CisaKevProvider } from "../adapters/kev.js";
import { FirstEpssProvider } from "../adapters/epss.js";
import { readRepositoryPolicyFile } from "../adapters/local-policy.js";
import { TrivyVulnerabilityDetector } from "../adapters/trivy.js";
import type { AnalyzeDependencies } from "../application/analyze.js";

/**
 * Entry-point-supplied inputs for constructing the `analyze`-path
 * `AnalyzeDependencies` set.
 *
 * `cacheRoot` and `readOrganizationPolicy` are intentionally supplied by the
 * caller (CLI vs. GitHub Action Controller) rather than fixed here: each
 * entry point has its own existing, unchanged behavior for both — see
 * `rules.md` BR1.2. `DependencyWiring` wires the mechanical construction
 * that is otherwise duplicated; it does not unify these divergences.
 */
export interface AnalyzeDependencyWiringOptions {
  /** Cache root directory for KEV/EPSS enrichment caching (entry-point-specific). */
  cacheRoot: string;
  /** Entry-point-specific organization policy reader (CLI stub vs. Action live read). */
  readOrganizationPolicy: AnalyzeDependencies["readOrganizationPolicy"];
}

/**
 * Constructs the `analyze`-path `AnalyzeDependencies` set shared by the CLI
 * (`src/cli/bootstrap.ts`) and the GitHub Action Controller
 * (`src/action/main.ts`). This is the extraction target of FR4.1: the
 * mechanical wiring of `RepositorySource`, `Detector`, `EnrichmentProvider`s,
 * `readRepositoryPolicy`, and `Clock` is identical across both entry
 * points today and is centralized here; `readOrganizationPolicy` and
 * `cacheRoot` remain entry-point-specific and are passed in unchanged.
 *
 * Remediate-path wiring and ecosystem-remediator construction are
 * explicitly out of scope — see `functional-spec.md`'s "Explicitly out of
 * `DependencyWiring`'s scope" section.
 */
export function createAnalyzeDependencies(
  options: AnalyzeDependencyWiringOptions,
): AnalyzeDependencies {
  const cache = new FileSystemCache(options.cacheRoot);
  const clock = { now: () => new Date() };

  return {
    repositorySource: new LocalGitRepositorySource(),
    detectors: [new TrivyVulnerabilityDetector()],
    enrichmentProviders: [
      new CisaKevProvider(cache, clock, fetch),
      new FirstEpssProvider(fetch),
    ],
    readOrganizationPolicy: options.readOrganizationPolicy,
    readRepositoryPolicy: readRepositoryPolicyFile,
    clock,
  };
}
