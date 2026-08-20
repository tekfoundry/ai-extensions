import { deactivateSkill, type DeactivateSkillResult } from "../../activation.js";
import { readLockfileJson } from "../../activation/lockfile.js";
import { promptForSelection } from "../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";
import type { Readable, Writable } from "node:stream";

function renderDeactivateResult(result: DeactivateSkillResult): string {
  const removalLines = result.removedActiveSkills.length > 0
    ? [
        result.removedActiveSkills.length === 1 ? "Removed active skill:" : "Removed active skills:",
        ...result.removedActiveSkills.map((skill) => `- ${skill.activeName} at ${skill.activationPath}`)
      ]
    : [`Kept active skill at ${result.activationPath} because remaining active skills depend on it.`];
  const packageLines = result.removedPackages.length > 0
    ? [
        result.removedPackages.length === 1 ? "Removed package:" : "Removed packages:",
        ...result.removedPackages.map((skill) => `- ${skill.activeName} at ${skill.packagePath}`)
      ]
    : [`Kept package at ${result.packagePath} because remaining active skills depend on it.`];

  return [
    `Deactivated skill ${result.activeName}.`,
    ...removalLines,
    ...packageLines,
    `Updated ${result.manifestPath}.`,
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

export function runDeactivateCommand(argv: string[]): CliResult {
  if (argv[1] !== "skill" || !argv[2]) {
    throw new CliError("Usage: aix deactivate skill <active-name>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDeactivateResult(deactivateSkill(argv[2])) };
}

function activeSkillOptions() {
  return readLockfileJson().skills
    .filter((skill) => skill.requested)
    .map((skill) => ({
      value: skill.activeName,
      label: skill.activeName,
      detail: `${skill.source}/${skill.sourcePath}`
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

async function promptForDeactivation(input: Readable, output: Writable): Promise<CliResult> {
  const activeName = await promptForSelection(
    "Select a skill to deactivate:",
    activeSkillOptions(),
    [],
    input,
    output,
    {
      prompt: "Select skill number: ",
      emptyMessage: "No user-activated skills found.",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!activeName) {
    return { exitCode: 0, stdout: "No skill selected." };
  }

  return { exitCode: 0, stdout: renderDeactivateResult(deactivateSkill(activeName)) };
}

async function promptForDeactivationKind(input: Readable, output: Writable): Promise<CliResult> {
  const deactivationKind = await promptForSelection(
    "What would you like to deactivate:",
    [{ value: "skills", label: "Skills" }],
    [],
    input,
    output,
    {
      prompt: "Select option: ",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!deactivationKind) {
    return { exitCode: 0, stdout: "No deactivation selected." };
  }

  return promptForDeactivation(input, output);
}

export const deactivateCommand: Command = {
  name: "deactivate",
  usage: "deactivate skill <active-name>",
  summary: "Deactivate a skill",
  splash: "deactivate skill <name>",
  run: runDeactivateCommand,
  async runInteractive(argv, context) {
    if (argv[1] === undefined) {
      return promptForDeactivationKind(context.input, context.output);
    }

    if (argv[1] === "skill" && argv[2] === undefined) {
      return promptForDeactivation(context.input, context.output);
    }

    return runDeactivateCommand(argv);
  }
};
