import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { CliError, EXIT_USAGE, toCliError } from "./errors.js";
import { commands, findCommand } from "./registry.js";
import type { CliResult } from "./types.js";

function readVersion(): string {
  try {
    const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };

    return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function renderCommandSplashLine(command: { usage: string; summary: string }): string {
  return `  ${command.usage.padEnd(39)} ${command.summary}`;
}

export function renderSplash(version = readVersion()): string {
  return [
    "AI Extensions",
    `aix v${version}`,
    "",
    "Commands:",
    ...commands.flatMap((command) => command.splash.map(renderCommandSplashLine)),
    "",
    "Run aix <command> --help for command details as commands land."
  ].join("\n");
}

export function renderHelp(): string {
  return renderSplash();
}

export function run(argv: string[]): CliResult {
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

function runOrThrow(argv: string[]): CliResult {
  const [commandName] = argv;

  if (!commandName || commandName === "--help" || commandName === "-h") {
    return { exitCode: 0, stdout: renderSplash() };
  }

  const command = findCommand(commandName);

  if (!command) {
    throw new CliError(`Unknown command: ${commandName}\n\n${renderHelp()}`, EXIT_USAGE);
  }

  return command.run(argv);
}

export async function runInteractive(
  argv: string[],
  input: Readable = process.stdin,
  output: Writable = process.stdout
): Promise<CliResult> {
  try {
    const commandName = argv[0];

    if (!commandName || commandName === "--help" || commandName === "-h") {
      return { exitCode: 0, stdout: renderSplash() };
    }

    const command = findCommand(commandName);

    if (!command) {
      throw new CliError(`Unknown command: ${commandName}\n\n${renderHelp()}`, EXIT_USAGE);
    }

    if (command.runInteractive) {
      return await command.runInteractive(argv, { input, output });
    }

    return command.run(argv);
  } catch (error) {
    const cliError = toCliError(error);

    return {
      exitCode: cliError.exitCode,
      stderr: cliError.message
    };
  }
}

export async function main(argv: string[]): Promise<void> {
  const result = await runInteractive(argv);

  if (result.stdout) {
    console.log(result.stdout);
  }

  if (result.stderr) {
    console.error(result.stderr);
  }

  process.exitCode = result.exitCode;
}
