import { execa } from "execa";

export interface ProcessRunner {
  run(
    command: string,
    args: string[],
    options?: { cwd?: string },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export const execProcessRunner: ProcessRunner = {
  async run(command, args, options) {
    const result = await execa(command, args, {
      reject: false,
      ...(options?.cwd ? { cwd: options.cwd } : {}),
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 0,
    };
  },
};
