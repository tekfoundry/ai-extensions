import { installWorkflow, type InstallWorkflowResult } from "../../workflows/index.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

function renderInstallWorkflowResult(result: InstallWorkflowResult): string {
  return [
    `Installed workflow ${result.name}.`,
    `Installed ${result.installedDocs.length} workflow docs.`,
    `Activated ${result.activatedSkills.length} workflow-owned skills.`,
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}

export function runInstallCommand(argv: string[]): CliResult {
  if (argv[1] !== "workflow" || !argv[2] || argv.length > 4) {
    throw new CliError("Usage: aix install workflow <git-or-github-tree-url> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderInstallWorkflowResult(installWorkflow(argv[2], argv[3])) };
}

export const installCommand: Command = {
  name: "install",
  usage: "install workflow <git-or-github-tree-url> [alias]",
  summary: "Install an AI workflow",
  splash: "install workflow <url> [alias]",
  run: runInstallCommand
};
