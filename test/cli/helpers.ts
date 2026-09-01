import { readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { withReportHash } from "../../src/application/report-hash.js";
import type { AnalysisReport } from "../../src/domain/model.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/reports/v1.json",
);

export function loadVerifiedReportFixture(): AnalysisReport {
  const baseReport = JSON.parse(readFileSync(fixturePath, "utf8")) as AnalysisReport;
  const { reportHash: _fixtureHash, ...baseReportBody } = baseReport;
  return withReportHash({
    ...baseReportBody,
    policy: {
      verified: true,
      sources: ["product-defaults", "organization-absent", "repository-absent"],
    },
    warnings: [],
  });
}

export function writeReportFixture(report: AnalysisReport): string {
  const directory = mkdtempSync(join(tmpdir(), "techdebtter-report-"));
  const filePath = join(directory, "report.json");
  writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}

export function captureIo(): {
  stdout: string;
  stderr: string;
  io: { stdout: Writable; stderr: Writable };
} {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  return {
    get stdout() {
      return stdoutChunks.join("");
    },
    get stderr() {
      return stderrChunks.join("");
    },
    io: {
      stdout: createWritable(stdoutChunks),
      stderr: createWritable(stderrChunks),
    },
  };
}

function createWritable(chunks: string[]): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
}
