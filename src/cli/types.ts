import type { Readable, Writable } from "node:stream";

export interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface CommandContext {
  input: Readable;
  output: Writable;
}

export interface CommandSplashLine {
  usage: string;
  summary: string;
}

export interface Command {
  name: string;
  usage: string;
  summary: string;
  splash: CommandSplashLine[];
  run: (argv: string[]) => CliResult;
  runInteractive?: (argv: string[], context: CommandContext) => Promise<CliResult>;
}
