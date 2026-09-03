import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import type { Writable } from "node:stream";
import { GhAuthError } from "../adapters/gh-auth.js";
import { PrerequisiteError } from "../adapters/errors.js";
import { analyze, type AnalyzeDependencies } from "../application/analyze.js";
import { publish, type PublishDependencies } from "../application/publish.js";
import { PublishError } from "../application/publish-error.js";
import { PolicyError } from "../domain/policy-error.js";
import type { AnalysisReport, Criticality, OperatingScope } from "../domain/model.js";
import {
  EXIT_FAIL_ON,
  EXIT_INVALID,
  EXIT_OPERATIONAL,
  EXIT_PREREQUISITE,
  EXIT_SUCCESS,
} from "./exit-codes.js";
import {
  exceedsFailOnThreshold,
  renderMarkdown,
  renderPublicationTerminal,
  renderTerminal,
} from "./render.js";

export interface CliIo {
  stdout: Writable;
  stderr: Writable;
}

export interface RunCliOptions {
  dependencies: AnalyzeDependencies;
  publishDependencies?: PublishDependencies;
  createPublishDependencies?: () => Promise<PublishDependencies>;
  io?: CliIo;
  confirm?: (summary: string) => Promise<boolean>;
}

const PACKAGE_VERSION = "0.1.0";
const REPORT_SCHEMA_VERSION = "1.0.0";

export async function runCli(
  argv: string[],
  options: RunCliOptions,
): Promise<number> {
  const io = options.io ?? { stdout: process.stdout, stderr: process.stderr };
  let exitCode = EXIT_SUCCESS;
  const program = new Command();

  program
    .name("techdebtter")
    .description("Analyze repositories for technical debt and vulnerabilities")
    .version(PACKAGE_VERSION);

  program
    .command("analyze")
    .argument("<path>", "Path to a local repository checkout")
    .option("--include-uncommitted", "Include uncommitted changes in analysis")
    .option("--format <format>", "Output format", "terminal")
    .option("--output <path>", "Write report output to a file")
    .option("--fail-on <criticality>", "Exit with code 10 when findings meet threshold")
    .action(async (path: string, flags: AnalyzeFlags) => {
      exitCode = await runAnalyzeCommand(path, flags, options.dependencies, io);
    });

  program
    .command("capabilities")
    .option("--json", "Emit JSON capabilities document")
    .action((flags: { json?: boolean }) => {
      const payload = {
        cliVersion: PACKAGE_VERSION,
        reportSchemaVersions: [REPORT_SCHEMA_VERSION],
        commands: ["analyze", "capabilities", "publish"],
        detectors: ["trivy-vulnerability"],
        publicationSupported: true,
      };
      if (flags.json) {
        io.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      } else {
        io.stdout.write("techdebtter capabilities: use --json\n");
      }
    });

  program
    .command("publish")
    .description("Publish selected findings to GitHub Finding Issues")
    .argument("<report>", "Path to an analysis report JSON file")
    .requiredOption("--select <id...>", "Finding selection IDs to publish")
    .option("--format <format>", "Output format", "terminal")
    .option("--yes", "Skip confirmation prompt")
    .action(async (reportPath: string, flags: PublishFlags) => {
      exitCode = await runPublishCommand(reportPath, flags, options, io);
    });

  try {
    await program.parseAsync(argv);
    return exitCode;
  } catch (error) {
    return mapErrorToExitCode(error, io);
  }
}

interface AnalyzeFlags {
  includeUncommitted?: boolean;
  format?: string;
  output?: string;
  failOn?: string;
}

interface PublishFlags {
  select: string[];
  format?: string;
  yes?: boolean;
}

async function runAnalyzeCommand(
  path: string,
  flags: AnalyzeFlags,
  dependencies: AnalyzeDependencies,
  io: CliIo,
): Promise<number> {
  const format = flags.format ?? "terminal";
  if (!["terminal", "json", "markdown"].includes(format)) {
    writeStructuredError(io.stderr, `Unsupported format: ${format}`, "invalid-format");
    return EXIT_INVALID;
  }

  let failOn: Criticality | undefined;
  if (flags.failOn) {
    if (!isCriticality(flags.failOn)) {
      writeStructuredError(
        io.stderr,
        `Unsupported fail-on criticality: ${flags.failOn}`,
        "invalid-fail-on",
      );
      return EXIT_INVALID;
    }
    failOn = flags.failOn;
  }

  try {
    const localPath = resolve(path);
    const report = await analyze(
      {
        organization: "unknown",
        repositories: [],
        localPath,
        includeUncommitted: Boolean(flags.includeUncommitted),
      },
      dependencies,
    );

    const rendered =
      format === "json"
        ? `${JSON.stringify(report, null, 2)}\n`
        : format === "markdown"
          ? renderMarkdown(report)
          : renderTerminal(report);

    if (flags.output) {
      await writeFile(flags.output, rendered, "utf8");
    } else {
      io.stdout.write(rendered);
    }

    if (failOn && exceedsFailOnThreshold(report.findings, failOn)) {
      return EXIT_FAIL_ON;
    }

    return EXIT_SUCCESS;
  } catch (error) {
    return mapErrorToExitCode(error, io);
  }
}

async function runPublishCommand(
  reportPath: string,
  flags: PublishFlags,
  options: RunCliOptions,
  io: CliIo,
): Promise<number> {
  const format = flags.format ?? "terminal";
  if (!["terminal", "json"].includes(format)) {
    writeStructuredError(io.stderr, `Unsupported format: ${format}`, "invalid-format");
    return EXIT_INVALID;
  }

  let report: AnalysisReport;
  try {
    const raw = await readFile(resolve(reportPath), "utf8");
    report = JSON.parse(raw) as AnalysisReport;
  } catch (error) {
    writeStructuredError(
      io.stderr,
      error instanceof Error ? error.message : "Failed to read analysis report",
      "invalid-report",
    );
    return EXIT_INVALID;
  }

  const scope = scopeFromReport(report);
  const selectedFindings = flags.select.map((selectionId) => {
    const finding = report.findings.find((entry) => entry.selectionId === selectionId);
    if (!finding) {
      return { selectionId, title: selectionId };
    }
    return { selectionId, title: finding.title };
  });

  const summary = buildPublishSummary(report, selectedFindings);
  if (!flags.yes) {
    if (!input.isTTY && !options.confirm) {
      writeStructuredError(
        io.stderr,
        "Refusing to publish without --yes in non-interactive mode",
        "confirmation-required",
      );
      return EXIT_INVALID;
    }
    const confirmed = await confirmPublication(summary, options.confirm, io);
    if (!confirmed) {
      writeStructuredError(io.stderr, "Publication cancelled", "cancelled");
      return EXIT_OPERATIONAL;
    }
  }

  try {
    const publishDependencies =
      options.publishDependencies ??
      (options.createPublishDependencies
        ? await options.createPublishDependencies()
        : undefined);
    if (!publishDependencies) {
      writeStructuredError(
        io.stderr,
        "Publish dependencies are not configured",
        "not-configured",
      );
      return EXIT_OPERATIONAL;
    }

    const result = await publish(report, flags.select, scope, publishDependencies);
    const rendered =
      format === "json"
        ? `${JSON.stringify(result, null, 2)}\n`
        : renderPublicationTerminal(result);
    io.stdout.write(rendered);
    return EXIT_SUCCESS;
  } catch (error) {
    return mapErrorToExitCode(error, io);
  }
}

function scopeFromReport(report: AnalysisReport): OperatingScope {
  return {
    organization: report.snapshot.owner,
    repositories: [report.snapshot.repo],
    localPath: "",
    includeUncommitted: false,
  };
}

function buildPublishSummary(
  report: AnalysisReport,
  selectedFindings: Array<{ selectionId: string; title: string }>,
): string {
  const lines = [
    `Publish ${selectedFindings.length} finding(s) to ${report.snapshot.owner}/${report.snapshot.repo}:`,
  ];
  for (const finding of selectedFindings) {
    lines.push(`  - ${finding.selectionId}: ${finding.title}`);
  }
  return lines.join("\n");
}

async function confirmPublication(
  summary: string,
  confirm: RunCliOptions["confirm"],
  io: CliIo,
): Promise<boolean> {
  io.stdout.write(`${summary}\nProceed? [y/N] `);
  if (confirm) {
    return confirm(summary);
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("");
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

function mapErrorToExitCode(error: unknown, io: CliIo): number {
  if (error instanceof PublishError) {
    writeStructuredError(io.stderr, error.message, error.code);
    return EXIT_INVALID;
  }
  if (error instanceof GhAuthError) {
    writeStructuredError(io.stderr, error.message, error.code);
    return EXIT_PREREQUISITE;
  }
  if (error instanceof PrerequisiteError) {
    writeStructuredError(io.stderr, error.message, error.code);
    return EXIT_PREREQUISITE;
  }
  if (error instanceof PolicyError) {
    writeStructuredError(io.stderr, error.message, "invalid-policy", error.errors);
    return EXIT_INVALID;
  }
  writeStructuredError(
    io.stderr,
    error instanceof Error ? error.message : String(error),
    "operational-error",
  );
  return EXIT_OPERATIONAL;
}

function writeStructuredError(
  stderr: Writable,
  message: string,
  code: string,
  details?: string[],
): void {
  stderr.write(
    `${JSON.stringify({ error: message, code, details: details ?? [] })}\n`,
  );
}

function isCriticality(value: string): value is Criticality {
  return value === "critical" || value === "high" || value === "medium" || value === "low";
}

const entryPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entryPath) {
  const { createDefaultAnalyzeDependencies, createDefaultPublishDependencies } =
    await import("./bootstrap.js");
  const exitCode = await runCli(process.argv, {
    dependencies: createDefaultAnalyzeDependencies(),
    createPublishDependencies: createDefaultPublishDependencies,
  });
  process.exitCode = exitCode;
}
