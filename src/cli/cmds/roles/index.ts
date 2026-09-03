import type { Readable, Writable } from "node:stream";
import { diffRoles, listSourceRoles, renderRoleList, updateRoles, type DiffRolesResult, type UpdateRolesResult } from "../../../roles.js";
import {
  addRoleSource,
  listRemoveRoleSourceChoices,
  removeRoleSource,
  type AddRoleSourceResult,
  type RemoveRoleSourceChoices,
  type RemoveRoleSourceResult
} from "../../../sources/management.js";
import { listRoleSourceDefinitions } from "../../../sources/index.js";
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

function renderAddRoleSourceResult(result: AddRoleSourceResult): string {
  return [
    result.added ? `Added roles source ${result.name}.` : `Roles source ${result.name} already exists.`,
    `Discovered ${result.roleCount} roles.`,
    `Wrote source metadata to ${result.metadataPath}.`,
    result.added ? `Wrote ${result.manifestPath}.` : `${result.manifestPath} unchanged.`
  ].join("\n");
}

function renderRemoveRoleSourceResult(result: RemoveRoleSourceResult): string {
  return [
    `Removed roles source ${result.name}.`,
    result.metadataRemoved
      ? `Removed source metadata at ${result.metadataPath}.`
      : `No source metadata found at ${result.metadataPath}.`,
    result.packageSourceRemoved
      ? `Removed empty package source directory ${result.packageSourcePath}.`
      : `No package source directory found at ${result.packageSourcePath}.`,
    `Wrote ${result.manifestPath}.`
  ].join("\n");
}

function renderUpdateResult(result: UpdateRolesResult): string {
  if (result.updatedRoles.length === 0) {
    return "No locked roles to update.";
  }

  return [
    "Updated locked roles:",
    ...result.updatedRoles.map((role) => {
      const commit = role.resolvedCommit && role.resolvedCommit !== role.previousResolvedCommit
        ? ` -> ${role.resolvedCommit}`
        : "";

      return `- ${role.source}/${role.sourcePath} as ${role.activeName}${commit}`;
    }),
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

function renderDiffResult(result: DiffRolesResult): string {
  if (result.diffs.length === 0) {
    return "No role changes.";
  }

  return result.diffs
    .flatMap((item) => [
      `Diff for ${item.source}/${item.sourcePath} as ${item.activeName}:`,
      item.diff.trimEnd()
    ])
    .join("\n");
}

function removeRoleSourceOptions(choices: RemoveRoleSourceChoices): SelectionOption<string>[] {
  return choices.removable.map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
}

function removeRoleSourceSections(choices: RemoveRoleSourceChoices): SelectionMenuSection[] {
  return [
    {
      header: "To remove the following sources deactivate their roles first:",
      items: choices.blocked.map((source) => source.name)
    }
  ];
}

export function renderRemoveRoleSourcePrompt(choices: RemoveRoleSourceChoices, options: RenderPromptOptions = {}): string {
  if (choices.removable.length === 0 && choices.blocked.length === 0) {
    return "No removable roles sources configured.";
  }

  return renderSelectionMenu("Select a roles source to remove:", removeRoleSourceOptions(choices), removeRoleSourceSections(choices), {
    ...options,
    emptyMessage: "No sources are currently removable."
  });
}

function roleSourceOptions() {
  return listRoleSourceDefinitions().map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
}

function runRolesAdd(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 4) {
    throw new CliError("Usage: aix roles add <git-or-github-tree-url> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderAddRoleSourceResult(addRoleSource(argv[2], argv[3])) };
}

function runRolesRemove(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix roles remove <source-name>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderRemoveRoleSourceResult(removeRoleSource(argv[2])) };
}

function runRolesList(argv: string[]): CliResult {
  const args = argv.slice(2);
  const missingOnly = args.includes("--missing-only");
  const sourceArgs = args.filter((arg) => arg !== "--missing-only");
  const sourceName = sourceArgs[0];

  if (!sourceName || sourceArgs.length > 1) {
    throw new CliError("Usage: aix roles list <source> [--missing-only]", EXIT_USAGE);
  }

  return {
    exitCode: 0,
    stdout: renderRoleList(sourceName, listSourceRoles(sourceName, { missingOnly }), { missingOnly })
  };
}

function runRolesUpdate(argv: string[]): CliResult {
  const reconcileProtected = argv.length === 4 && argv[3] === "--reconcile-protected";
  if (argv.length > 4 || (argv[2] && !reconcileProtected)) {
    throw new CliError("Usage: aix roles update [active-name|source/path] [--reconcile-protected]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderUpdateResult(updateRoles(argv[2], undefined, { reconcileProtected })) };
}

function runRolesDiff(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix roles diff [active-name|source/path]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDiffResult(diffRoles(argv[2])) };
}

function runRolesCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "add":
      return runRolesAdd(argv);
    case "remove":
      return runRolesRemove(argv);
    case "list":
      return runRolesList(argv);
    case "update":
      return runRolesUpdate(argv);
    case "diff":
      return runRolesDiff(argv);
    default:
      throw new CliError("Usage: aix roles <add|remove|list|update|diff>", EXIT_USAGE);
  }
}

async function promptForRemovedRoleSource(input: Readable, output: Writable): Promise<CliResult> {
  const choices = listRemoveRoleSourceChoices();

  if (choices.removable.length === 0 && choices.blocked.length === 0) {
    throw new CliError("No removable roles sources configured.");
  }

  const sourceName = await promptForSelection(
    "Select a roles source to remove:",
    removeRoleSourceOptions(choices),
    removeRoleSourceSections(choices),
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

  return { exitCode: 0, stdout: renderRemoveRoleSourceResult(removeRoleSource(sourceName)) };
}

async function promptForRoleSourceList(input: Readable, output: Writable, options: { missingOnly?: boolean } = {}): Promise<CliResult> {
  const sourceName = await promptForSelection("Select a roles source to list:", roleSourceOptions(), [], input, output, {
    prompt: "Select source number: ",
    emptyMessage: "No roles sources configured.",
    invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
  });

  if (!sourceName) {
    return { exitCode: 0, stdout: "No roles source selected." };
  }

  return {
    exitCode: 0,
    stdout: renderRoleList(sourceName, listSourceRoles(sourceName, options), options)
  };
}

export const rolesCommand: Command = {
  name: "roles",
  usage: "roles <add|remove|list|update|diff>",
  summary: "Manage role sources and locked roles",
  splash: [
    { usage: "roles add <url> [alias]", summary: "Add a Git role source" },
    { usage: "roles remove <source>", summary: "Remove a role source" },
    { usage: "roles list [source] [--missing-only]", summary: "List discoverable roles" },
    { usage: "roles update [active-name|source/path]", summary: "Refresh locked roles" },
    { usage: "roles diff [active-name|source/path]", summary: "Show pending role changes" }
  ],
  run: runRolesCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "remove" && argv[2] === undefined) {
      return promptForRemovedRoleSource(context.input, context.output);
    }

    if (argv[1] === "list" && (argv[2] === undefined || (argv[2] === "--missing-only" && argv[3] === undefined))) {
      return promptForRoleSourceList(context.input, context.output, { missingOnly: argv[2] === "--missing-only" });
    }

    return runRolesCommand(argv);
  }
};
