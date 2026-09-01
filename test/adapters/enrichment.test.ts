import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Detection } from "../../src/domain/model.js";
import type { Cache, Clock } from "../../src/domain/ports.js";
import { FirstEpssProvider, FIRST_EPSS_BASE_URL } from "../../src/adapters/epss.js";
import { FileSystemCache } from "../../src/adapters/fs-cache.js";
import { CisaKevProvider, CISA_KEV_URL } from "../../src/adapters/kev.js";
import type { FetchFn } from "../../src/adapters/fetch.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");
const kevFixture = readFileSync(join(fixturesDir, "kev/catalog.json"), "utf8");
const epssFixture = readFileSync(join(fixturesDir, "epss/response.json"), "utf8");

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("CisaKevProvider", () => {
  it("uses the CISA feed URL and writes timestamped Evidence", async () => {
    const fetchFn = vi.fn<FetchFn>().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => kevFixture,
    });
    const cache = new MemoryCache();
    const clock = fixedClock("2026-08-31T12:00:00.000Z");
    const provider = new CisaKevProvider(cache, clock, fetchFn);

    const result = await provider.enrich([detection(["CVE-2026-0001"])]);

    expect(fetchFn).toHaveBeenCalledWith(CISA_KEV_URL);
    expect(result.evidenceByVulnerability.get("CVE-2026-0001")).toEqual([
      expect.objectContaining({
        kind: "kev",
        source: "cisa-kev",
        subject: "CVE-2026-0001",
        value: true,
        url: CISA_KEV_URL,
        observedAt: "2026-08-31T12:00:00.000Z",
      }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("avoids fetch when a fresh daily cache entry exists", async () => {
    const fetchFn = vi.fn<FetchFn>();
    const cache = new MemoryCache();
    const clock = fixedClock("2026-08-31T15:00:00.000Z");
    await cache.set("kev/catalog/2026-08-31", kevFixture, "2026-08-31T12:00:00.000Z");

    const provider = new CisaKevProvider(cache, clock, fetchFn);
    const result = await provider.enrich([detection(["CVE-2026-0001"])]);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.evidenceByVulnerability.has("CVE-2026-0001")).toBe(true);
  });

  it("falls back to cache and warns when fetch fails", async () => {
    const fetchFn = vi.fn<FetchFn>().mockRejectedValue(new Error("network down"));
    const cache = new MemoryCache();
    await cache.set("kev/catalog/2026-08-31", kevFixture, "2026-08-30T12:00:00.000Z");
    const provider = new CisaKevProvider(
      cache,
      fixedClock("2026-08-31T12:00:00.000Z"),
      fetchFn,
    );

    const result = await provider.enrich([detection(["CVE-2026-0001"])]);

    expect(result.warnings.some((warning) => /cached catalog/i.test(warning))).toBe(
      true,
    );
    expect(result.evidenceByVulnerability.has("CVE-2026-0001")).toBe(true);
  });

  it("returns warnings without negative Evidence when fetch and cache fail", async () => {
    const fetchFn = vi.fn<FetchFn>().mockRejectedValue(new Error("network down"));
    const provider = new CisaKevProvider(
      new MemoryCache(),
      fixedClock("2026-08-31T12:00:00.000Z"),
      fetchFn,
    );

    const result = await provider.enrich([detection(["CVE-2026-0001"])]);

    expect(result.evidenceByVulnerability.size).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("FirstEpssProvider", () => {
  it("batches sorted unique CVEs through the FIRST EPSS API", async () => {
    const requestedUrls: string[] = [];
    const fetchFn = vi.fn<FetchFn>().mockImplementation(async (url) => {
      requestedUrls.push(url);
      return { ok: true, status: 200, text: async () => epssFixture };
    });
    const provider = new FirstEpssProvider(fetchFn);

    const result = await provider.enrich([
      detection(["CVE-2026-0002"]),
      detection(["CVE-2026-0001", "CVE-2026-0002"]),
    ]);

    expect(requestedUrls).toEqual([
      `${FIRST_EPSS_BASE_URL}?cve=CVE-2026-0001,CVE-2026-0002`,
    ]);
    expect(result.evidenceByVulnerability.get("CVE-2026-0001")).toEqual([
      expect.objectContaining({
        kind: "epss",
        source: "first-epss",
        subject: "CVE-2026-0001",
        value: 0.97123,
      }),
    ]);
  });

  it("warns without negative Evidence when EPSS is unavailable", async () => {
    const fetchFn = vi.fn<FetchFn>().mockRejectedValue(new Error("network down"));
    const provider = new FirstEpssProvider(fetchFn);
    const result = await provider.enrich([detection(["CVE-2026-0001"])]);

    expect(result.evidenceByVulnerability.size).toBe(0);
    expect(result.warnings.some((warning) => /EPSS enrichment unavailable/i.test(warning))).toBe(
      true,
    );
  });
});

describe("FileSystemCache", () => {
  it("persists cache entries on disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "techdebtter-cache-"));
    tempDirs.push(dir);
    const cache = new FileSystemCache(dir);
    await cache.set("kev/catalog/2026-08-31", kevFixture, "2026-08-31T12:00:00.000Z");

    expect(await cache.get("kev/catalog/2026-08-31")).toEqual({
      storedAt: "2026-08-31T12:00:00.000Z",
      value: kevFixture,
    });
  });
});

class MemoryCache implements Cache {
  private readonly entries = new Map<string, { storedAt: string; value: string }>();

  async get(key: string) {
    return this.entries.get(key);
  }

  async set(key: string, value: string, storedAt: string) {
    this.entries.set(key, { storedAt, value });
  }
}

function fixedClock(iso: string): Clock {
  return {
    now() {
      return new Date(iso);
    },
  };
}

function detection(vulnerabilityIds: string[]): Detection {
  return {
    fingerprint: "det-1",
    detector: "trivy-vulnerability",
    detectorVersion: "0.60.0",
    class: "vulnerability",
    packageEcosystem: "npm",
    packageName: "lodash",
    installedVersion: "4.17.21",
    fixedVersions: ["4.17.22"],
    vulnerabilityIds,
    target: "package-lock.json",
    severity: "high",
    evidence: [],
  };
}
