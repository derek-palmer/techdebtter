import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../schemas/analysis-report.schema.json",
);

export const analysisReportSchema = JSON.parse(
  readFileSync(schemaPath, "utf8"),
) as object;

export function createAnalysisReportValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(analysisReportSchema);
}
