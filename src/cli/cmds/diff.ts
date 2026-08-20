import { diffSkills, type DiffSkillsResult } from "../../activation.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

function renderDiffResult(result: DiffSkillsResult): string {
  if (result.diffs.length === 0) {
    return "No skill changes.";
  }

  return result.diffs
    .flatMap((item) => [
      `Diff for ${item.source}/${item.sourcePath} as ${item.activeName}:`,
      item.diff.trimEnd()
    ])
    .join("\n");
}

export function runDiffCommand(argv: string[]): CliResult {
  if (argv.length > 2) {
    throw new CliError("Usage: aix diff [source/path]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDiffResult(diffSkills(argv[1])) };
}

export const diffCommand: Command = {
  name: "diff",
  usage: "diff [source/path]",
  summary: "Show pending skill changes",
  splash: "diff [source/path]",
  run: runDiffCommand
};
