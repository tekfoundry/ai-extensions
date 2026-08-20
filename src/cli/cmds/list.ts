import type { Readable, Writable } from "node:stream";
import { listSourceSkills, renderSkillList } from "../../skills.js";
import { listSourceDefinitions } from "../../sources/index.js";
import { promptForSelection } from "../../ui/selection-prompt.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

export function runListCommand(argv: string[]): CliResult {
  if (argv[1] !== "skills") {
    throw new CliError("Usage: aix list skills <source>", EXIT_USAGE);
  }

  const sourceName = argv[2];

  if (!sourceName) {
    throw new CliError("Usage: aix list skills <source>", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderSkillList(sourceName, listSourceSkills(sourceName)) };
}

function skillSourceOptions() {
  return listSourceDefinitions().map((source) => ({
    value: source.name,
    label: source.name,
    detail: source.definition.url
  }));
}

export async function promptForSkillSourceList(input: Readable, output: Writable): Promise<CliResult> {
  const sourceName = await promptForSelection("Select a skills source to list:", skillSourceOptions(), [], input, output, {
    prompt: "Select source number: ",
    emptyMessage: "No skills sources configured.",
    invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
  });

  if (!sourceName) {
    return { exitCode: 0, stdout: "No skills source selected." };
  }

  return { exitCode: 0, stdout: renderSkillList(sourceName, listSourceSkills(sourceName)) };
}

export async function promptForListKind(input: Readable, output: Writable): Promise<CliResult> {
  const listKind = await promptForSelection(
    "What would you like to list:",
    [{ value: "skills", label: "Skills" }],
    [],
    input,
    output,
    {
      prompt: "Select option: ",
      invalidSelectionError: (answer) => new CliError(`Invalid selection: ${answer}`, EXIT_USAGE)
    }
  );

  if (!listKind) {
    return { exitCode: 0, stdout: "No list selected." };
  }

  return promptForSkillSourceList(input, output);
}

export const listCommand: Command = {
  name: "list",
  usage: "list skills [source]",
  summary: "List skill sources or discoverable skills",
  splash: "list skills [source]",
  run: runListCommand,
  async runInteractive(argv, context) {
    if (argv[1] === undefined) {
      return promptForListKind(context.input, context.output);
    }

    if (argv[1] === "skills" && argv[2] === undefined) {
      return promptForSkillSourceList(context.input, context.output);
    }

    return runListCommand(argv);
  }
};
