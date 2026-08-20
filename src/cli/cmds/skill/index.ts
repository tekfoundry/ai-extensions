import type { Readable, Writable } from "node:stream";
import { activateSkill, deactivateSkill, type ActivateSkillResult, type DeactivateSkillResult } from "../../../activation.js";
import { readLockfileJson } from "../../../activation/lockfile.js";
import { listSourceSkills } from "../../../skills.js";
import { listSourceDefinitions } from "../../../sources/index.js";
import { promptForSelection } from "../../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function renderActivateResult(result: ActivateSkillResult): string {
  return [
    ...result.dependencies.map(
      (dependency) => `Activated dependency ${dependency.source}/${dependency.sourcePath} as ${dependency.activeName}.`
    ),
    `Activated skill ${result.source}/${result.sourcePath} as ${result.activeName}.`,
    `Materialized package at ${result.packagePath}.`,
    `Wrote active skill at ${result.activationPath}.`,
    `Updated ${result.manifestPath}.`,
    `Updated ${result.lockfilePath}.`
  ].join("\n");
}

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

function sourceOptions() {
  return listSourceDefinitions().map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
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

function runSkillActivate(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 4) {
    throw new CliError("Usage: aix skill activate <source/path> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderActivateResult(activateSkill(argv[2], argv[3])) };
}

function runSkillDeactivate(argv: string[]): CliResult {
  if (!argv[2] || argv.length > 3) {
    throw new CliError("Usage: aix skill deactivate <active-name>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDeactivateResult(deactivateSkill(argv[2])) };
}

function runSkillCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "activate":
      return runSkillActivate(argv);
    case "deactivate":
      return runSkillDeactivate(argv);
    default:
      throw new CliError("Usage: aix skill <activate|deactivate>", EXIT_USAGE);
  }
}

async function promptForActivation(input: Readable, output: Writable): Promise<CliResult> {
  const sourceName = await promptForSelection("Select a skills source to activate from:", sourceOptions(), [], input, output, {
    prompt: "Select source number: ",
    emptyMessage: "No skills sources configured.",
    invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
  });

  if (!sourceName) {
    return { exitCode: 0, stdout: "No skills source selected." };
  }

  const skill = await promptForSelection(
    `Select a skill from ${sourceName}:`,
    listSourceSkills(sourceName).map((item) => ({
      value: item.path,
      label: item.path,
      detail: item.name
    })),
    [],
    input,
    output,
    {
      prompt: "Select skill number: ",
      emptyMessage: "No inactive skills found.",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!skill) {
    return { exitCode: 0, stdout: "No skill selected." };
  }

  return { exitCode: 0, stdout: renderActivateResult(activateSkill(`${sourceName}/${skill}`)) };
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

export const skillCommand: Command = {
  name: "skill",
  usage: "skill <activate|deactivate>",
  summary: "Activate or deactivate one skill",
  splash: [
    { usage: "skill activate [source/path]", summary: "Activate a skill" },
    { usage: "skill deactivate <name>", summary: "Deactivate a skill" }
  ],
  run: runSkillCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "activate" && argv[2] === undefined) {
      return promptForActivation(context.input, context.output);
    }

    if (argv[1] === "deactivate" && argv[2] === undefined) {
      return promptForDeactivation(context.input, context.output);
    }

    return runSkillCommand(argv);
  }
};
