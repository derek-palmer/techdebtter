import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Cache } from "../domain/ports.js";

export class FileSystemCache implements Cache {
  constructor(private readonly root: string) {}

  async get(
    key: string,
  ): Promise<{ storedAt: string; value: string } | undefined> {
    try {
      const raw = await readFile(this.entryPath(key), "utf8");
      const parsed = JSON.parse(raw) as { storedAt: string; value: string };
      if (
        typeof parsed.storedAt !== "string" ||
        typeof parsed.value !== "string"
      ) {
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string, storedAt: string): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(
      this.entryPath(key),
      JSON.stringify({ storedAt, value }),
      "utf8",
    );
  }

  private entryPath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9._-]+/g, "_");
    return join(this.root, `${safeKey}.json`);
  }
}
