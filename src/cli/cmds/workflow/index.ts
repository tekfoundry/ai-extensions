import type { Readable, Writable } from "node:stream";
import {
  diffWorkflow,
  installBundledWorkflow,
  installWorkflow,
  listBundledWorkflows,
  removeWorkflow,
  updateWorkflow,
  type DiffWorkflowResult,
  type InstallWorkflowResult,
  type RemoveWorkflowResult,
  type UpdateWorkflowResult
} from "../../../workflows/index.js";
import { promptForSelection } from "../../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";
import { createInterface } from "node:readline";
import { readLockfileJson } from "../../../activation/lockfile.js";
import { workflowPmDatasets, workflowPmWarning } from "../../../workflows/pm-runtime.js";

function renderInstallWorkflowResult(result: InstallWorkflowResult): string {
  return [
    `Installed workflow ${result.name}.`,
    `Installed ${result.installedDocs.length} workflow docs.`,
    `Installed ${result.installedGuidance} workflow guidance docs.`,
    `Installed ${result.installedTemplates} workflow templates.`,
    `Activated ${result.activatedSkills.length} workflow-owned skills.`,
    `Activated ${result.activatedRoles.length} workflow-owned roles.`,
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}

function renderRemoveWorkflowResult(result: RemoveWorkflowResult): string {
  return [
    `Removed workflow ${result.name}.`,
    `Removed ${result.removedDocs.length} workflow docs.`,
    `Removed ${result.removedSkills.length} workflow-owned skills.`,
    `Removed ${result.removedRoles.length} workflow-owned roles.`,
    result.removedAgentsMdBlock ? "Removed workflow block from AGENTS.md." : "No workflow block found in AGENTS.md.",
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
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

function runWorkflowInstall(argv: string[]): CliResult {
  if (argv.length > 4) {
    throw new CliError("Usage: aix workflow install [git-or-github-tree-url] [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderInstallWorkflowResult(installWorkflow(argv[2], argv[3])) };
}

function runWorkflowUninstall(argv: string[]): CliResult {
  if (argv.length > 3 || (argv[2] && argv[2] !== "--confirm-pm-data")) {
    throw new CliError("Usage: aix workflow uninstall [--confirm-pm-data]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderRemoveWorkflowResult(removeWorkflow({ confirmPmData: argv[2] === "--confirm-pm-data" })) };
}

async function confirmWorkflowPmData(input: Readable, output: Writable, workflowName: string, count: number): Promise<boolean> {
  output.write(`Workflow ${workflowName} has ${count} active or unlanded PM delegation dataset(s). Delete only those runtime datasets before uninstall? [y/N] `);
  const reader = createInterface({ input, output });
  return new Promise((resolve) => reader.once("line", (answer) => { reader.close(); resolve(/^y(?:es)?$/i.test(answer.trim())); }));
}

function runWorkflowUpdate(argv: string[]): CliResult {
  if (argv.length > 2) {
    throw new CliError("Usage: aix workflow update", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderUpdateWorkflowResult(updateWorkflow()) };
}

function runWorkflowDiff(argv: string[]): CliResult {
  if (argv.length > 2) {
    throw new CliError("Usage: aix workflow diff", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderWorkflowDiffResult(diffWorkflow()) };
}

function runWorkflowCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "install":
      return runWorkflowInstall(argv);
    case "uninstall":
      return runWorkflowUninstall(argv);
    case "update":
      return runWorkflowUpdate(argv);
    case "diff":
      return runWorkflowDiff(argv);
    default:
      throw new CliError("Usage: aix workflow <install|uninstall|update|diff>", EXIT_USAGE);
  }
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

export const workflowCommand: Command = {
  name: "workflow",
  usage: "workflow <install|uninstall|update|diff>",
  summary: "Manage the active AI workflow",
  splash: [
    { usage: "workflow install [url] [alias]", summary: "Install an AI workflow" },
    { usage: "workflow uninstall", summary: "Uninstall an AI workflow" },
    { usage: "workflow update", summary: "Refresh the active workflow" },
    { usage: "workflow diff", summary: "Show pending workflow changes" }
  ],
  run: runWorkflowCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "install" && argv[2] === undefined) {
      return promptForWorkflowInstall(context.input, context.output);
    }

    if (argv[1] === "uninstall" && argv.length === 2 && "isTTY" in context.input && context.input.isTTY === true && "isTTY" in context.output && context.output.isTTY === true) {
      const workflow = readLockfileJson().workflows?.[0];
      if (workflow) {
        const warning = workflowPmWarning(workflowPmDatasets(process.cwd(), workflow.name));
        if (warning.length > 0 && !(await confirmWorkflowPmData(context.input, context.output, workflow.name, warning.length))) {
          return { exitCode: 0, stdout: "Workflow uninstall cancelled. No changes made." };
        }
        return { exitCode: 0, stdout: renderRemoveWorkflowResult(removeWorkflow({ confirmPmData: warning.length > 0 })) };
      }
    }

    return runWorkflowCommand(argv);
  }
};
