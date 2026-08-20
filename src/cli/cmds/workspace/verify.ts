import { verifySkills, type VerifySkillsResult } from "../../../activation.js";
import { verifyWorkflow } from "../../../workflows/index.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function renderVerifyResult(result: VerifySkillsResult): string {
  if (result.issues.length === 0) {
    return "AI Extensions verification passed.";
  }

  return [
    "AI Extensions verification failed:",
    ...result.issues.map((issue) => `- ${issue}`)
  ].join("\n");
}

function runVerify(argv: string[]): CliResult {
  if (argv.length > 1) {
    throw new CliError("Usage: aix verify", EXIT_USAGE);
  }

  const result = verifySkills();
  const workflowResult = verifyWorkflow();
  const issues = [...result.issues, ...workflowResult.issues];

  return {
    exitCode: issues.length === 0 ? 0 : 2,
    stdout: renderVerifyResult({ issues })
  };
}

export const verifyCommand: Command = {
  name: "verify",
  usage: "verify",
  summary: "Check installed AI Extension state",
  splash: [{ usage: "verify", summary: "Check installed AI Extension state" }],
  run: runVerify
};
