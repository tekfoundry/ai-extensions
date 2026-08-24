import type { Readable, Writable } from "node:stream";
import { diffSkills, updateSkills, type DiffSkillsResult, type UpdateSkillsResult } from "../../../activation.js";
import { listSourceSkills, renderSkillList } from "../../../skills.js";
import {
  addSource,
  listRemoveSourceChoices,
  removeSource,
  type AddSourceResult,
  type RemoveSourceChoices,
  type RemoveSourceResult
} from "../../../sources/management.js";
import { listSourceDefinitions } from "../../../sources/index.js";
import {
  promptForSelection,
  renderSelectionMenu,
  type SelectionMenuSection,
  type SelectionOption
} from "../../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

interface RenderPromptOptions {
  color?: boolean;
}

function renderAddSourceResult(result: AddSourceResult): string {
  return [
    result.added ? `Added skills source ${result.name}.` : `Skills source ${result.name} already exists.`,
    `Discovered ${result.skillCount} skills.`,
    `Wrote source metadata to ${result.metadataPath}.`,
    result.added ? `Wrote ${result.manifestPath}.` : `${result.manifestPath} unchanged.`
  ].join("\n");
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

function skillSourceOptions() {
  return listSourceDefinitions().map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
}

function runSkillsAdd(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 4) {
    throw new CliError("Usage: aix skills add <git-or-github-tree-url> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderAddSourceResult(addSource(argv[2], argv[3])) };
}

function runSkillsRemove(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix skills remove <source-name>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderRemoveSourceResult(removeSource(argv[2])) };
}

function runSkillsList(argv: string[]): CliResult {
  const args = argv.slice(2);
  const missingOnly = args.includes("--missing-only");
  const sourceArgs = args.filter((arg) => arg !== "--missing-only");
  const sourceName = sourceArgs[0];

  if (!sourceName || sourceArgs.length > 1) {
    throw new CliError("Usage: aix skills list <source> [--missing-only]", EXIT_USAGE);
  }

  return {
    exitCode: 0,
    stdout: renderSkillList(sourceName, listSourceSkills(sourceName, { missingOnly }), { missingOnly })
  };
}

function runSkillsUpdate(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix skills update [source/path]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderUpdateResult(updateSkills(argv[2])) };
}

function runSkillsDiff(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix skills diff [source/path]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDiffResult(diffSkills(argv[2])) };
}

function runSkillsCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "add":
      return runSkillsAdd(argv);
    case "remove":
      return runSkillsRemove(argv);
    case "list":
      return runSkillsList(argv);
    case "update":
      return runSkillsUpdate(argv);
    case "diff":
      return runSkillsDiff(argv);
    default:
      throw new CliError("Usage: aix skills <add|remove|list|update|diff>", EXIT_USAGE);
  }
}

async function promptForRemovedSkillSource(input: Readable, output: Writable): Promise<CliResult> {
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

async function promptForSkillSourceList(input: Readable, output: Writable, options: { missingOnly?: boolean } = {}): Promise<CliResult> {
  const sourceName = await promptForSelection("Select a skills source to list:", skillSourceOptions(), [], input, output, {
    prompt: "Select source number: ",
    emptyMessage: "No skills sources configured.",
    invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
  });

  if (!sourceName) {
    return { exitCode: 0, stdout: "No skills source selected." };
  }

  return {
    exitCode: 0,
    stdout: renderSkillList(sourceName, listSourceSkills(sourceName, options), options)
  };
}

export const skillsCommand: Command = {
  name: "skills",
  usage: "skills <add|remove|list|update|diff>",
  summary: "Manage skill sources and locked skills",
  splash: [
    { usage: "skills add <url> [alias]", summary: "Add a Git skill source" },
    { usage: "skills remove <source>", summary: "Remove a skill source" },
    { usage: "skills list [source] [--missing-only]", summary: "List discoverable skills" },
    { usage: "skills update [source/path]", summary: "Refresh locked skills" },
    { usage: "skills diff [source/path]", summary: "Show pending skill changes" }
  ],
  run: runSkillsCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "remove" && argv[2] === undefined) {
      return promptForRemovedSkillSource(context.input, context.output);
    }

    if (argv[1] === "list" && (argv[2] === undefined || (argv[2] === "--missing-only" && argv[3] === undefined))) {
      return promptForSkillSourceList(context.input, context.output, { missingOnly: argv[2] === "--missing-only" });
    }

    return runSkillsCommand(argv);
  }
};
