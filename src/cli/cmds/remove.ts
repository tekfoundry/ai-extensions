import type { Readable, Writable } from "node:stream";
import {
  listRemoveSourceChoices,
  removeSource,
  type RemoveSourceChoices,
  type RemoveSourceResult
} from "../../sources/management.js";
import { removeWorkflow, type RemoveWorkflowResult } from "../../workflows/index.js";
import { promptForSelection, renderSelectionMenu, type SelectionMenuSection, type SelectionOption } from "../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

interface RenderPromptOptions {
  color?: boolean;
}

function renderRemoveSourceResult(result: RemoveSourceResult): string {
  return [
    `Removed skills source ${result.name}.`,
    result.metadataRemoved
      ? `Removed source metadata at ${result.metadataPath}.`
      : `No source metadata found at ${result.metadataPath}.`,
    result.packageSourceRemoved
      ? `Removed empty package source directory ${result.packageSourcePath}.`
      : `No package source directory found at ${result.packageSourcePath}.`,
    `Wrote ${result.manifestPath}.`
  ].join("\n");
}

function renderRemoveWorkflowResult(result: RemoveWorkflowResult): string {
  return [
    `Removed workflow ${result.name}.`,
    `Removed ${result.removedDocs.length} workflow docs.`,
    `Removed ${result.removedSkills.length} workflow-owned skills.`,
    result.removedAgentsMdBlock ? "Removed workflow block from AGENTS.md." : "No workflow block found in AGENTS.md.",
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}

function removeSourceOptions(choices: RemoveSourceChoices): SelectionOption<string>[] {
  return choices.removable.map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
}

function removeSourceSections(choices: RemoveSourceChoices): SelectionMenuSection[] {
  return [
    {
      header: "To remove the following sources deactivate their skills first:",
      items: choices.blocked.map((source) => source.name)
    }
  ];
}

export function renderRemoveSourcePrompt(choices: RemoveSourceChoices, options: RenderPromptOptions = {}): string {
  if (choices.removable.length === 0 && choices.blocked.length === 0) {
    return "No removable skills sources configured.";
  }

  return renderSelectionMenu("Select a skills source to remove:", removeSourceOptions(choices), removeSourceSections(choices), {
    ...options,
    emptyMessage: "No sources are currently removable."
  });
}

export function runRemoveCommand(argv: string[]): CliResult {
  if (argv[1] === "workflow") {
    if (argv.length > 2) {
      throw new CliError("Usage: aix remove workflow", EXIT_USAGE);
    }

    return { exitCode: 0, stdout: renderRemoveWorkflowResult(removeWorkflow()) };
  }

  if (argv[1] !== "skills" || !argv[2]) {
    throw new CliError("Usage: aix remove skills <source-name> | aix remove workflow", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderRemoveSourceResult(removeSource(argv[2])) };
}

export async function promptForRemovedSkillSource(input: Readable, output: Writable): Promise<CliResult> {
  const choices = listRemoveSourceChoices();

  if (choices.removable.length === 0 && choices.blocked.length === 0) {
    throw new CliError("No removable skills sources configured.");
  }

  const sourceName = await promptForSelection(
    "Select a skills source to remove:",
    removeSourceOptions(choices),
    removeSourceSections(choices),
    input,
    output,
    {
      prompt: "Select source number: ",
      emptyMessage: "No sources are currently removable.",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!sourceName) {
    return { exitCode: 0, stdout: "No source removed." };
  }

  return { exitCode: 0, stdout: renderRemoveSourceResult(removeSource(sourceName)) };
}

export const removeCommand: Command = {
  name: "remove",
  usage: "remove skills <source-name> | remove workflow",
  summary: "Remove a skill source or workflow",
  splash: "remove skills <source>",
  run: runRemoveCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "skills" && argv[2] === undefined) {
      return promptForRemovedSkillSource(context.input, context.output);
    }

    return runRemoveCommand(argv);
  }
};
