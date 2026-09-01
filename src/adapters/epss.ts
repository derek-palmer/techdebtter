import type { Detection, Evidence } from "../domain/model.js";
import type { EnrichmentProvider } from "../domain/ports.js";
import type { FetchFn } from "./fetch.js";

export const FIRST_EPSS_BASE_URL = "https://api.first.org/data/v1/epss";

const MAX_BATCH_SIZE = 100;

interface EpssRow {
  cve?: string;
  epss?: string;
  date?: string;
}

interface EpssResponse {
  data?: EpssRow[];
}

export class FirstEpssProvider implements EnrichmentProvider {
  readonly id = "first-epss";
  private readonly fetchFn: FetchFn;

  constructor(fetchFn: FetchFn) {
    this.fetchFn = fetchFn;
  }

  async enrich(detections: Detection[]): Promise<{
    evidenceByVulnerability: Map<string, Evidence[]>;
    warnings: string[];
  }> {
    const requested = collectVulnerabilityIds(detections);
    const evidenceByVulnerability = new Map<string, Evidence[]>();
    const warnings: string[] = [];

    if (requested.length === 0) {
      return { evidenceByVulnerability, warnings };
    }

    for (let index = 0; index < requested.length; index += MAX_BATCH_SIZE) {
      const batch = requested.slice(index, index + MAX_BATCH_SIZE);
      try {
        const url = `${FIRST_EPSS_BASE_URL}?cve=${batch.join(",")}`;
        const response = await this.fetchFn(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (JSON.parse(await response.text()) as EpssResponse).data ?? [];
        const observedAt = new Date().toISOString();
        for (const row of body) {
          const cve = row.cve?.trim().toUpperCase();
          const score = row.epss ? Number.parseFloat(row.epss) : Number.NaN;
          if (!cve || !Number.isFinite(score)) {
            continue;
          }
          evidenceByVulnerability.set(cve, [
            {
              kind: "epss",
              source: "first-epss",
              observedAt,
              subject: cve,
              value: score,
              url,
            },
          ]);
        }
      } catch (error) {
        warnings.push(
          `FIRST EPSS enrichment unavailable for batch starting ${batch[0]}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (evidenceByVulnerability.size === 0 && requested.length > 0) {
      warnings.push("FIRST EPSS enrichment unavailable; confidence reduced");
    }

    return { evidenceByVulnerability, warnings };
  }
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
