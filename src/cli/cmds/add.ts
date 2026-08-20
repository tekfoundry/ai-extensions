import { addSource, type AddSourceResult } from "../../sources/management.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

function renderAddSourceResult(result: AddSourceResult): string {
  return [
    result.added ? `Added skills source ${result.name}.` : `Skills source ${result.name} already exists.`,
    `Discovered ${result.skillCount} skills.`,
    `Wrote source metadata to ${result.metadataPath}.`,
    result.added ? `Wrote ${result.manifestPath}.` : `${result.manifestPath} unchanged.`
  ].join("\n");
}

export function runAddCommand(argv: string[]): CliResult {
  if (argv[1] !== "skills" || !argv[2]) {
    throw new CliError("Usage: aix add skills <git-or-github-tree-url> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderAddSourceResult(addSource(argv[2], argv[3])) };
}

export const addCommand: Command = {
  name: "add",
  usage: "add skills <git-or-github-tree-url> [alias]",
  summary: "Add a Git skill source",
  splash: "add skills <url> [alias]",
  run: runAddCommand
};
