import { updateSkills, type UpdateSkillsResult } from "../../activation.js";
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

export function runUpdateCommand(argv: string[]): CliResult {
  if (argv.length > 2) {
    throw new CliError("Usage: aix update [source/path]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderUpdateResult(updateSkills(argv[1])) };
}

export const updateCommand: Command = {
  name: "update",
  usage: "update [source/path]",
  summary: "Refresh locked skills",
  splash: "update [source/path]",
  run: runUpdateCommand
};
