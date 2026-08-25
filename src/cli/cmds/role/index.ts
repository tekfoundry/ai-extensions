import { deactivateRole, type DeactivateRoleResult } from "../../../roles.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function renderDeactivateResult(result: DeactivateRoleResult): string {
  return [
    `Deactivated role ${result.activeName}.`,
    `Removed active role at ${result.activationPath}.`,
    `Removed package at ${result.packagePath}.`,
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

function runRoleDeactivate(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix role deactivate <active-name>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDeactivateResult(deactivateRole(argv[2])) };
}

function runRoleCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "deactivate":
      return runRoleDeactivate(argv);
    default:
      throw new CliError("Usage: aix role <deactivate>", EXIT_USAGE);
  }
}

export const roleCommand: Command = {
  name: "role",
  usage: "role <deactivate>",
  summary: "Manage active roles",
  splash: [{ usage: "role deactivate <name>", summary: "Deactivate a role" }],
  run: runRoleCommand
};
