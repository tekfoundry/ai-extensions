import type { Readable, Writable } from "node:stream";
import {
  activateRoleFromDefinitions,
  deactivateRole,
  diffRoles,
  listSourceRoles,
  updateRoles,
  type DeactivateRoleResult,
  type DiffRolesResult,
  type RoleActivationResult,
  type UpdateRolesResult
} from "../../../roles.js";
import { readLockfileJson } from "../../../activation/lockfile.js";
import { getDefaultRoleSources, listRoleSourceDefinitions } from "../../../sources/index.js";
import { promptForSelection } from "../../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function renderActivateResult(result: RoleActivationResult): string {
  return [
    `Activated role ${result.source}/${result.sourcePath} as ${result.activeName}.`,
    `Materialized package at ${result.packagePath}.`,
    `Wrote active role at ${result.activationPath}.`,
    `Updated ${result.manifestPath}.`,
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

function renderDeactivateResult(result: DeactivateRoleResult): string {
  return [
    `Deactivated role ${result.activeName}.`,
    `Removed active role at ${result.activationPath}.`,
    `Removed package at ${result.packagePath}.`,
    `Updated ${result.manifestPath}.`,
    `Updated ${result.lockfilePath}.`
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

function roleSourceOptions() {
  return listRoleSourceDefinitions().map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
}

function activeRoleOptions() {
  return (readLockfileJson().roles || [])
    .filter((role) => role.requested && !role.owner)
    .map((role) => ({
      value: role.activeName,
      label: role.activeName,
      detail: `${role.source}/${role.sourcePath}`
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function runRoleActivate(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 4) {
    throw new CliError("Usage: aix role activate <source/path> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderActivateResult(activateRoleFromDefinitions(argv[2], argv[3], getDefaultRoleSources())) };
}

function runRoleDeactivate(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix role deactivate <active-name>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDeactivateResult(deactivateRole(argv[2])) };
}

function runRoleUpdate(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix role update <active-name|source/path>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderUpdateResult(updateRoles(argv[2])) };
}

function runRoleDiff(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix role diff <active-name|source/path>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDiffResult(diffRoles(argv[2])) };
}

function runRoleCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "activate":
      return runRoleActivate(argv);
    case "deactivate":
      return runRoleDeactivate(argv);
    case "update":
      return runRoleUpdate(argv);
    case "diff":
      return runRoleDiff(argv);
    default:
      throw new CliError("Usage: aix role <activate|deactivate|update|diff>", EXIT_USAGE);
  }
}

async function promptForActivation(input: Readable, output: Writable): Promise<CliResult> {
  const sourceName = await promptForSelection("Select a roles source to activate from:", roleSourceOptions(), [], input, output, {
    prompt: "Select source number: ",
    emptyMessage: "No roles sources configured.",
    invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
  });

  if (!sourceName) {
    return { exitCode: 0, stdout: "No roles source selected." };
  }

  const role = await promptForSelection(
    `Select a role from ${sourceName}:`,
    listSourceRoles(sourceName).map((item) => ({
      value: item.path,
      label: item.path,
      detail: item.name
    })),
    [],
    input,
    output,
    {
      prompt: "Select role number: ",
      emptyMessage: "No inactive roles found.",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!role) {
    return { exitCode: 0, stdout: "No role selected." };
  }

  return { exitCode: 0, stdout: renderActivateResult(activateRoleFromDefinitions(`${sourceName}/${role}`, undefined, getDefaultRoleSources())) };
}

async function promptForDeactivation(input: Readable, output: Writable): Promise<CliResult> {
  const activeName = await promptForSelection(
    "Select a role to deactivate:",
    activeRoleOptions(),
    [],
    input,
    output,
    {
      prompt: "Select role number: ",
      emptyMessage: "No user-activated roles found.",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!activeName) {
    return { exitCode: 0, stdout: "No role selected." };
  }

  return { exitCode: 0, stdout: renderDeactivateResult(deactivateRole(activeName)) };
}

export const roleCommand: Command = {
  name: "role",
  usage: "role <activate|deactivate|update|diff>",
  summary: "Activate or deactivate one role",
  splash: [
    { usage: "role activate [source/path]", summary: "Activate a role" },
    { usage: "role deactivate <name>", summary: "Deactivate a role" },
    { usage: "role update <name|source/path>", summary: "Refresh one role" },
    { usage: "role diff <name|source/path>", summary: "Show pending role changes" }
  ],
  run: runRoleCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "activate" && argv[2] === undefined) {
      return promptForActivation(context.input, context.output);
    }

    if (argv[1] === "deactivate" && argv[2] === undefined) {
      return promptForDeactivation(context.input, context.output);
    }

    return runRoleCommand(argv);
  }
};
