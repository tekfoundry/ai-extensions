import { skillsCommand } from "../skills/index.js";
import { workflowCommand } from "../workflow/index.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function combineStdout(...parts: Array<string | undefined>): string | undefined {
  const output = parts.filter((part): part is string => Boolean(part));

  return output.length > 0 ? output.join("\n\n") : undefined;
}

function runWorkspaceUpdate(argv: string[]): CliResult {
  if (argv.length > 1) {
    throw new CliError("Usage: aix update", EXIT_USAGE);
  }

  const workflowResult = workflowCommand.run(["workflow", "update"]);

  if (workflowResult.exitCode !== 0) {
    return workflowResult;
  }

  const skillsResult = skillsCommand.run(["skills", "update"]);

  if (skillsResult.exitCode !== 0) {
    return {
      exitCode: skillsResult.exitCode,
      stdout: combineStdout(workflowResult.stdout, skillsResult.stdout),
      stderr: skillsResult.stderr
    };
  }

  return {
    exitCode: 0,
    stdout: combineStdout(workflowResult.stdout, skillsResult.stdout)
  };
}

export const updateCommand: Command = {
  name: "update",
  usage: "update",
  summary: "Refresh the active workflow and locked skills",
  splash: [
    { usage: "update", summary: "Refresh the active workflow and locked skills" }
  ],
  run: runWorkspaceUpdate
};
