import { removeWorkflow } from "../../workflows/index.js";
import { renderRemoveWorkflowResult } from "./remove.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

export function runUninstallCommand(argv: string[]): CliResult {
  if (argv[1] !== "workflow" || argv.length > 2) {
    throw new CliError("Usage: aix uninstall workflow", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderRemoveWorkflowResult(removeWorkflow()) };
}

export const uninstallCommand: Command = {
  name: "uninstall",
  usage: "uninstall workflow",
  summary: "Uninstall an AI workflow",
  splash: "uninstall workflow",
  run: runUninstallCommand
};
