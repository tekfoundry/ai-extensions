import { skillsCommand } from "../skills/index.js";
import { forceUpdateWorkspace } from "../../../force-update/coordinator.js";
import { rolesCommand } from "../roles/index.js";
import { workflowCommand } from "../workflow/index.js";
import { CliError, EXIT_USAGE, toCliError } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";
import { deleteForceBackup, renderForceAudit } from "../../../force-update/audit.js";
import { createInterface } from "node:readline/promises";
import type { CommandContext } from "../../types.js";

function combineStdout(...parts: Array<string | undefined>): string | undefined {
  const output = parts.filter((part): part is string => Boolean(part));

  return output.length > 0 ? output.join("\n\n") : undefined;
}

function renderMissingSkillsList(): string | undefined {
  try {
    const result = skillsCommand.run(["skills", "list", "aix", "--missing-only"]);

    return result.exitCode === 0
      ? result.stdout
      : `Unable to list missing skills: ${result.stderr || "unknown error"}`;
  } catch (error) {
    return `Unable to list missing skills: ${toCliError(error).message}`;
  }
}

function renderForceResult(result: ReturnType<typeof forceUpdateWorkspace>, includeAudit = true): string {
  if (result.state === "failed") {
    const backup = result.backupPath
      ? `Backup retained at ${result.backupPath}.`
      : "No backup was created; no project files were changed.";
    return `Force update stopped during the ${result.failure?.stage || "unknown"} stage. ${backup} ${result.failure?.message || "Unknown error"}`;
  }
  const audit = includeAudit && result.audit ? `\n${renderForceAudit(result.audit)}` : "";
  const cleanup = result.cleanup?.error
    ? `\nBackup cleanup failed; it remains at ${result.backupPath}. Resolve the cleanup error before deleting it: ${result.cleanup.error}`
    : result.cleanup?.retained
      ? `\nBackup retained at ${result.backupPath}${result.cleanup?.decision === "non-interactive" ? " (non-interactive mode; no prompt was shown)" : " (default: keep)"}.`
      : result.cleanup?.retained === false
        ? "\nBackup deleted after explicit operator confirmation."
        : "";
  return `Force update completed and passed verification.${cleanup}${audit}`;
}

function renderInteractiveForceResult(result: ReturnType<typeof forceUpdateWorkspace>, cleanupNote: string): string {
  return `${renderForceResult(result, false)}${cleanupNote}`;
}

async function runInteractiveWorkspaceUpdate(argv: string[], context: CommandContext): Promise<CliResult> {
  if (!argv.includes("--force")) return runWorkspaceUpdate(argv);
  const result = forceUpdateWorkspace({ force: true, projectRoot: process.cwd(), interactive: true });
  if (result.state === "failed" || !result.audit) return { exitCode: result.state === "failed" ? 2 : 0, stdout: renderForceResult(result) };
  const prompt = createInterface({ input: context.input, output: context.output });
  let note = "";
  context.output.write(`${renderForceAudit(result.audit)}\n`);
  try {
    const answer = await prompt.question(`Delete the backup at ${result.backupPath} after reviewing the audit? [y/N] `);
    if (answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes") {
      try { deleteForceBackup(result.backupPath, process.cwd()); note = "\nBackup deleted after explicit operator confirmation."; }
      catch (error) { note = `\nBackup cleanup failed; it remains at ${result.backupPath}. Resolve the cleanup error before deleting it: ${error instanceof Error ? error.message : String(error)}`; }
    } else {
      note = `\nBackup retained at ${result.backupPath} (default: keep).`;
    }
  } catch { note = `\nInput ended or was cancelled; backup retained at ${result.backupPath}. Review or recover from that path before retrying.`; }
  finally { prompt.close(); }
  const rendered = renderInteractiveForceResult(result, note);
  return { exitCode: 0, stdout: rendered };
}

function runWorkspaceUpdate(argv: string[]): CliResult {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { exitCode: 0, stdout: "Usage: aix update [--force]\n\nRefresh the active workflow, locked skills, and locked roles. --force backs up the AIX installation before a clean rebuild." };
  }
  const force = argv.includes("--force");
  if (argv.length > 2 || (argv.length === 2 && !force)) {
    throw new CliError("Usage: aix update [--force]", EXIT_USAGE);
  }
  if (force) {
    const result = forceUpdateWorkspace({ force: true, projectRoot: process.cwd(), interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY) });
    return { exitCode: result.state === "failed" ? 2 : 0, stdout: renderForceResult(result) };
  }

  const workflowResult = workflowCommand.run(["workflow", "update"]);

  if (workflowResult.exitCode !== 0) {
    return workflowResult;
  }

  const skillsResult = skillsCommand.run(["skills", "update"]);

  if (skillsResult.exitCode !== 0) {
    return {
      exitCode: skillsResult.exitCode,
      stdout: combineStdout(workflowResult.stdout, skillsResult.stdout),
      stderr: skillsResult.stderr
    };
  }

  const rolesResult = rolesCommand.run(["roles", "update"]);

  if (rolesResult.exitCode !== 0) {
    return {
      exitCode: rolesResult.exitCode,
      stdout: combineStdout(workflowResult.stdout, skillsResult.stdout, rolesResult.stdout),
      stderr: rolesResult.stderr
    };
  }

  return {
    exitCode: 0,
    stdout: combineStdout(
      workflowResult.stdout,
      skillsResult.stdout,
      rolesResult.stdout,
      renderMissingSkillsList()
    )
  };
}

export const updateCommand: Command = {
  name: "update",
  usage: "update",
  summary: "Refresh the active workflow, locked skills, and locked roles",
  splash: [
    { usage: "update", summary: "Refresh the active workflow, locked skills, and locked roles" }
  ],
  run: runWorkspaceUpdate,
  runInteractive: runInteractiveWorkspaceUpdate
};
