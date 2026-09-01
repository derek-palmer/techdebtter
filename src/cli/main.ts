import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import type { Writable } from "node:stream";
import { analyze, type AnalyzeDependencies } from "../application/analyze.js";
import { PrerequisiteError } from "../adapters/errors.js";
import { PolicyError } from "../domain/policy-error.js";
import type { Criticality } from "../domain/model.js";
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
  renderTerminal,
} from "./render.js";

export interface CliIo {
  stdout: Writable;
  stderr: Writable;
}

export interface RunCliOptions {
  dependencies: AnalyzeDependencies;
  io?: CliIo;
}

const PACKAGE_VERSION = "0.1.0";
const REPORT_SCHEMA_VERSION = "1.0.0";

export async function runCli(
  argv: string[],
  options: RunCliOptions,
): Promise<number> {
  const io = options.io ?? { stdout: process.stdout, stderr: process.stderr };
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
      const exitCode = await runAnalyzeCommand(path, flags, options.dependencies, io);
      process.exitCode = exitCode;
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
    .description("Publish selected findings to GitHub (implemented in a later slice)")
    .action(() => {
      writeStructuredError(io.stderr, "publish is not implemented yet", "not-implemented");
      process.exitCode = EXIT_OPERATIONAL;
    });

  try {
    await program.parseAsync(argv);
    const exitCode = process.exitCode ?? EXIT_SUCCESS;
    return typeof exitCode === "number" ? exitCode : EXIT_OPERATIONAL;
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

function mapErrorToExitCode(error: unknown, io: CliIo): number {
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
  const { createDefaultAnalyzeDependencies } = await import("./bootstrap.js");
  const exitCode = await runCli(process.argv, {
    dependencies: createDefaultAnalyzeDependencies(),
  });
  process.exitCode = exitCode;
}
