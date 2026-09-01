import type { Detection, Evidence } from "../domain/model.js";
import type { Cache, Clock, EnrichmentProvider } from "../domain/ports.js";

export const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface KevCatalog {
  vulnerabilities?: Array<{ cveID?: string }>;
}

import type { FetchFn } from "./fetch.js";

export class CisaKevProvider implements EnrichmentProvider {
  readonly id = "cisa-kev";
  private readonly cache: Cache;
  private readonly clock: Clock;
  private readonly fetchFn: FetchFn;

  constructor(cache: Cache, clock: Clock, fetchFn: FetchFn) {
    this.cache = cache;
    this.clock = clock;
    this.fetchFn = fetchFn;
  }

  async enrich(detections: Detection[]): Promise<{
    evidenceByVulnerability: Map<string, Evidence[]>;
    warnings: string[];
  }> {
    const requested = collectVulnerabilityIds(detections);
    const warnings: string[] = [];
    const evidenceByVulnerability = new Map<string, Evidence[]>();

    if (requested.length === 0) {
      return { evidenceByVulnerability, warnings };
    }

    const loaded = await this.loadCatalog(warnings);
    if (!loaded) {
      warnings.push("CISA KEV enrichment unavailable; confidence reduced");
      return { evidenceByVulnerability, warnings };
    }

    const known = new Set(
      (loaded.catalog.vulnerabilities ?? [])
        .map((entry) => entry.cveID?.trim().toUpperCase())
        .filter((cve): cve is string => Boolean(cve)),
    );

    for (const cve of requested) {
      if (!known.has(cve)) {
        continue;
      }
      const evidence: Evidence = {
        kind: "kev",
        source: "cisa-kev",
        observedAt: loaded.fetchedAt,
        subject: cve,
        value: true,
        url: CISA_KEV_URL,
      };
      evidenceByVulnerability.set(cve, [evidence]);
    }

    return { evidenceByVulnerability, warnings };
  }

  private async loadCatalog(
    warnings: string[],
  ): Promise<{ catalog: KevCatalog; fetchedAt: string } | undefined> {
    const now = this.clock.now();
    const cacheKey = `kev/catalog/${now.toISOString().slice(0, 10)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached && isFresh(cached.storedAt, now)) {
      return {
        catalog: JSON.parse(cached.value) as KevCatalog,
        fetchedAt: cached.storedAt,
      };
    }

    try {
      const response = await this.fetchFn(CISA_KEV_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = await response.text();
      validateKevCatalog(body);
      const fetchedAt = now.toISOString();
      await this.cache.set(cacheKey, body, fetchedAt);
      return {
        catalog: JSON.parse(body) as KevCatalog,
        fetchedAt,
      };
    } catch (error) {
      if (cached) {
        warnings.push("CISA KEV fetch failed; using cached catalog");
        return {
          catalog: JSON.parse(cached.value) as KevCatalog,
          fetchedAt: cached.storedAt,
        };
      }
      warnings.push(
        `CISA KEV fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }
}

function validateKevCatalog(body: string): void {
  const parsed = JSON.parse(body) as KevCatalog;
  if (!Array.isArray(parsed.vulnerabilities)) {
    throw new Error("Invalid CISA KEV catalog shape");
  }
}

function isFresh(storedAt: string, now: Date): boolean {
  const storedMs = Date.parse(storedAt);
  if (Number.isNaN(storedMs)) {
    return false;
  }
  return now.getTime() - storedMs < CACHE_TTL_MS;
}

function collectVulnerabilityIds(detections: Detection[]): string[] {
  const ids = new Set<string>();
  for (const detection of detections) {
    for (const vulnerabilityId of detection.vulnerabilityIds) {
      ids.add(vulnerabilityId.trim().toUpperCase());
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}
