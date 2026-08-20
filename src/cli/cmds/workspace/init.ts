import { initProject, renderInitResult } from "../../../init.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function runInit(argv: string[]): CliResult {
  if (argv.length > 1) {
    throw new CliError("Usage: aix init", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderInitResult(initProject()) };
}

export const initCommand: Command = {
  name: "init",
  usage: "init",
  summary: "Initialize AI Extensions in this workspace",
  splash: [{ usage: "init", summary: "Initialize AI Extensions in this workspace" }],
  run: runInit
};
