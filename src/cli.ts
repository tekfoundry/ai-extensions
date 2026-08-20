import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError, EXIT_USAGE, toCliError } from "./errors.js";
import { initProject, renderInitResult } from "./init.js";
import { listSourceSkills, renderSkillList } from "./skills.js";

const COMMANDS = ["init", "install", "update", "diff", "verify", "list"] as const;

type Command = (typeof COMMANDS)[number];

function readVersion(): string {
  try {
    const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };

    return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function renderSplash(version = readVersion()): string {
  return [
    "AI Extensions",
    `aix v${version}`,
    "",
    "Commands:",
    "  init                   Initialize AI Extensions in this project",
    "  install [source/path]  Install declared skills",
    "  update [source/path]   Refresh locked skills",
    "  diff [source/path]     Show pending skill changes",
    "  verify                 Check installed skill state",
    "  list <source>          List discoverable skills from a source",
    "",
    "Run aix <command> --help for command details as commands land."
  ].join("\n");
}

export function renderHelp(): string {
  return renderSplash();
}

function isCommand(value: string): value is Command {
  return COMMANDS.includes(value as Command);
}

export function run(argv: string[]): { exitCode: number; stdout?: string; stderr?: string } {
  try {
    return runOrThrow(argv);
  } catch (error) {
    const cliError = toCliError(error);

    return {
      exitCode: cliError.exitCode,
      stderr: cliError.message
    };
  }
}

function runOrThrow(argv: string[]): { exitCode: number; stdout?: string; stderr?: string } {
  const [command] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { exitCode: 0, stdout: renderSplash() };
  }

  if (!isCommand(command)) {
    throw new CliError(`Unknown command: ${command}\n\n${renderHelp()}`, EXIT_USAGE);
  }

  if (command === "init") {
    return { exitCode: 0, stdout: renderInitResult(initProject()) };
  }

  if (command === "list") {
    const sourceName = argv[1];

    if (!sourceName) {
      throw new CliError("Usage: aix list <source>", EXIT_USAGE);
    }

    return { exitCode: 0, stdout: renderSkillList(sourceName, listSourceSkills(sourceName)) };
  }

  throw new CliError(`Command not implemented yet: ${command}`);
}

export function main(argv: string[]): void {
  const result = run(argv);

  if (result.stdout) {
    console.log(result.stdout);
  }

  if (result.stderr) {
    console.error(result.stderr);
  }

  process.exitCode = result.exitCode;
}
