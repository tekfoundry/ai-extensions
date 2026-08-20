import type { Readable, Writable } from "node:stream";
import { activateSkill, type ActivateSkillResult } from "../../activation.js";
import { listSourceSkills } from "../../skills.js";
import { listSourceDefinitions } from "../../sources/index.js";
import { promptForSelection } from "../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

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

export function runActivateCommand(argv: string[]): CliResult {
  if (argv[1] !== "skill" || !argv[2]) {
    throw new CliError("Usage: aix activate skill <source/path> [alias]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderActivateResult(activateSkill(argv[2], argv[3])) };
}

function sourceOptions() {
  return listSourceDefinitions().map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
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

async function promptForActivationKind(input: Readable, output: Writable): Promise<CliResult> {
  const activationKind = await promptForSelection(
    "What would you like to activate:",
    [{ value: "skills", label: "Skills" }],
    [],
    input,
    output,
    {
      prompt: "Select option: ",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!activationKind) {
    return { exitCode: 0, stdout: "No activation selected." };
  }

  return promptForActivation(input, output);
}

export const activateCommand: Command = {
  name: "activate",
  usage: "activate skill [source/path] [alias]",
  summary: "Activate a skill",
  splash: "activate skill [source/path]",
  run: runActivateCommand,
  async runInteractive(argv, context) {
    if (argv[1] === undefined) {
      return promptForActivationKind(context.input, context.output);
    }

    if (argv[1] === "skill" && argv[2] === undefined) {
      return promptForActivation(context.input, context.output);
    }

    return runActivateCommand(argv);
  }
};
