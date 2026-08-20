import { updateSkills, type UpdateSkillsResult } from "../../activation.js";
import { updateWorkflow, type UpdateWorkflowResult } from "../../workflows/index.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

function renderUpdateResult(result: UpdateSkillsResult): string {
  if (result.updatedSkills.length === 0) {
    return "No locked skills to update.";
  }

  return [
    "Updated locked skills:",
    ...result.updatedSkills.map((skill) => {
      const commit = skill.resolvedCommit && skill.resolvedCommit !== skill.previousResolvedCommit
        ? ` -> ${skill.resolvedCommit}`
        : "";

      return `- ${skill.source}/${skill.sourcePath} as ${skill.activeName}${commit}`;
    }),
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

function renderUpdateWorkflowResult(result: UpdateWorkflowResult): string {
  if (result.updatedWorkflows.length === 0) {
    return "No active workflow to update.";
  }

  return [
    "Updated workflow:",
    ...result.updatedWorkflows.map((workflow) => {
      const commit = workflow.resolvedCommit && workflow.resolvedCommit !== workflow.previousResolvedCommit
        ? ` -> ${workflow.resolvedCommit}`
        : "";

      return `- ${workflow.name}${commit}`;
    }),
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

export function runUpdateCommand(argv: string[]): CliResult {
  if (argv[1] === "workflow") {
    if (argv.length > 2) {
      throw new CliError("Usage: aix update workflow", EXIT_USAGE);
    }

    return { exitCode: 0, stdout: renderUpdateWorkflowResult(updateWorkflow()) };
  }

  if (argv.length > 2) {
    throw new CliError("Usage: aix update [source/path] | aix update workflow", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderUpdateResult(updateSkills(argv[1])) };
}

export const updateCommand: Command = {
  name: "update",
  usage: "update [source/path] | update workflow",
  summary: "Refresh locked skills or workflow",
  splash: "update [source/path]",
  run: runUpdateCommand
};
