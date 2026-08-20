import { initProject, renderInitResult } from "../../init.js";
import type { CliResult, Command } from "../types.js";

export function runInitCommand(): CliResult {
  return { exitCode: 0, stdout: renderInitResult(initProject()) };
}

export const initCommand: Command = {
  name: "init",
  usage: "init",
  summary: "Initialize AI Extensions in this project",
  splash: "init",
  run: runInitCommand
};
