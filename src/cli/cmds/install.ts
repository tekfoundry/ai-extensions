import type { Readable, Writable } from "node:stream";
import { installBundledWorkflow, installWorkflow, listBundledWorkflows, type InstallWorkflowResult } from "../../workflows/index.js";
import { promptForSelection } from "../../ui/selection-prompt.js";
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
  if (argv[1] !== "workflow" || argv.length > 4) {
    throw new CliError("Usage: aix install workflow [git-or-github-tree-url] [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderInstallWorkflowResult(installWorkflow(argv[2], argv[3])) };
}

async function promptForWorkflowInstall(input: Readable, output: Writable): Promise<CliResult> {
  const workflowName = await promptForSelection(
    "Select a bundled workflow to install:",
    listBundledWorkflows().map((workflow) => ({
      value: workflow.name,
      label: workflow.name,
      detail: workflow.title
    })),
    [],
    input,
    output,
    {
      prompt: "Select workflow number: ",
      emptyMessage: "No bundled workflows found.",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!workflowName) {
    return { exitCode: 0, stdout: "No workflow selected." };
  }

  return { exitCode: 0, stdout: renderInstallWorkflowResult(installBundledWorkflow(workflowName)) };
}

export const installCommand: Command = {
  name: "install",
  usage: "install workflow [git-or-github-tree-url] [alias]",
  summary: "Install an AI workflow",
  splash: "install workflow [url] [alias]",
  run: runInstallCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "workflow" && argv[2] === undefined) {
      return promptForWorkflowInstall(context.input, context.output);
    }

    return runInstallCommand(argv);
  }
};
