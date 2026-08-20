import { CliError } from "./errors.js";
import type { CliResult, Command } from "./types.js";

function pendingCommand(name: string, splash: string, summary: string): Command {
  return {
    name,
    usage: splash,
    splash,
    summary,
    run(): CliResult {
      throw new CliError(`Command not implemented yet: ${name}`);
    }
  };
}

export const activateCommand = pendingCommand("activate", "activate skill [source/path]", "Activate a skill");
export const deactivateCommand = pendingCommand("deactivate", "deactivate skill <name>", "Deactivate a skill");
export const updateCommand = pendingCommand("update", "update [source/path]", "Refresh locked skills");
export const diffCommand = pendingCommand("diff", "diff [source/path]", "Show pending skill changes");
export const verifyCommand = pendingCommand("verify", "verify", "Check installed skill state");
