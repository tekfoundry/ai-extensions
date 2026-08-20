import { verifySkills, type VerifySkillsResult } from "../../activation.js";
import { CliError, EXIT_USAGE } from "../errors.js";
import type { CliResult, Command } from "../types.js";

function renderVerifyResult(result: VerifySkillsResult): string {
  if (result.issues.length === 0) {
    return "AI Extensions verification passed.";
  }

  return [
    "AI Extensions verification failed:",
    ...result.issues.map((issue) => `- ${issue}`)
  ].join("\n");
}

export function runVerifyCommand(argv: string[]): CliResult {
  if (argv.length > 1) {
    throw new CliError("Usage: aix verify", EXIT_USAGE);
  }

  const result = verifySkills();

  return {
    exitCode: result.issues.length === 0 ? 0 : 2,
    stdout: renderVerifyResult(result)
  };
}

export const verifyCommand: Command = {
  name: "verify",
  usage: "verify",
  summary: "Check installed skill state",
  splash: "verify",
  run: runVerifyCommand
};
