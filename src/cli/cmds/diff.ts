import { diffSkills, type DiffSkillsResult } from "../../activation.js";
import { diffWorkflow, type DiffWorkflowResult } from "../../workflows/index.js";
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

function renderWorkflowDiffResult(result: DiffWorkflowResult): string {
  if (result.diffs.length === 0) {
    return "No workflow changes.";
  }

  return result.diffs
    .flatMap((item) => [
      `Diff for workflow ${item.name}:`,
      item.diff.trimEnd()
    ])
    .join("\n");
}

export function runDiffCommand(argv: string[]): CliResult {
  if (argv[1] === "workflow") {
    if (argv.length > 2) {
      throw new CliError("Usage: aix diff workflow", EXIT_USAGE);
    }

    return { exitCode: 0, stdout: renderWorkflowDiffResult(diffWorkflow()) };
  }

  if (argv.length > 2) {
    throw new CliError("Usage: aix diff [source/path] | aix diff workflow", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDiffResult(diffSkills(argv[1])) };
}

export const diffCommand: Command = {
  name: "diff",
  usage: "diff [source/path] | diff workflow",
  summary: "Show pending skill or workflow changes",
  splash: "diff [source/path]",
  run: runDiffCommand
};
