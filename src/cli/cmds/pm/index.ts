import { readLockfileJson } from "../../../activation/lockfile.js";
import { listDelegations } from "../../../pm/delegation.js";
import { readPmSession } from "../../../pm/session.js";
import { applyPmTidy, archivePmTidy, previewPmTidy } from "../../../pm/tidy.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";
import type { Readable, Writable } from "node:stream";
import { createInterface } from "node:readline";

function runPmStatus(argv: string[]): CliResult {
  if (argv.length > 3) throw new CliError("Usage: aix pm status", EXIT_USAGE);
  const { session, lease } = readPmSession();
  const workflow = readLockfileJson().workflows?.[0];
  const delegations = listDelegations();

  return {
    exitCode: 0,
    stdout: [
      "PM status",
      `Session: ${session?.sessionId || "none"}`,
      `Lease: ${lease && lease.expiresAt > new Date().toISOString() ? `active until ${lease.expiresAt}` : "inactive"}`,
      `Workflow: ${workflow?.name || "none"}`,
      `Delegations: ${delegations.length}`,
      ...(delegations.length === 0
        ? ["  none"]
        : delegations.map((record) => `  ${record.contract.identity.displayName} (${record.contract.identity.delegationId}): ${record.state}`))
    ].join("\n")
  };
}

function runPmTidy(argv: string[]): CliResult {
  let mutation: "archive" | "apply" | "purge" | undefined;
  let includeCompleted = false;
  let olderThanDays: number | undefined;
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--archive" || arg === "--apply" || arg === "--purge") {
      if (mutation && mutation !== arg.slice(2)) throw new CliError("Choose only one of --archive, --apply, or --purge.", EXIT_USAGE);
      mutation = arg.slice(2) as "archive" | "apply" | "purge";
    }
    else if (arg === "--completed") includeCompleted = true;
    else if (arg === "--older-than") {
      const value = Number(argv[++index]);
      if (!Number.isInteger(value) || value < 0) throw new CliError("Usage: aix pm tidy [--archive|--apply|--purge] [--completed] [--older-than days]", EXIT_USAGE);
      olderThanDays = value;
    } else throw new CliError("Usage: aix pm tidy [--archive|--apply|--purge] [--completed] [--older-than days]", EXIT_USAGE);
  }
  const report = previewPmTidy({ olderThanDays, includeCompleted });
  const lines = [`PM tidy preview (cutoff: ${report.cutoff})`];
  for (const item of report.candidates) lines.push(`- ${item.action}: ${item.displayName} (${item.delegationId}) — ${item.reason}`);
  for (const diagnostic of report.diagnostics) lines.push(`- diagnostic: ${diagnostic}`);
  if (report.candidates.length === 0) lines.push("- no delegation records found");
  if (!mutation) return { exitCode: 0, stdout: `${lines.join("\n")}\nPreview only: no changes made. Use --archive, --apply, or --purge to authorize cleanup.` };
  if (mutation === "archive" || mutation === "apply") {
    const result = archivePmTidy(report);
    return { exitCode: 0, stdout: `${lines.join("\n")}\n${mutation === "apply" ? "Applied reversible housekeeping to" : "Archived"} ${result.archived.length} delegation dataset(s); live data was retained.` };
  }
  const result = applyPmTidy(report);
  return { exitCode: 0, stdout: `${lines.join("\n")}\nPurged ${result.purged.length} delegation dataset(s) and ${result.purgedDiagnostics.length} diagnostic log(s).` };
}

function confirm(input: Readable, output: Writable, mutation: string): Promise<boolean> {
  return new Promise((resolve) => {
    output.write(`Confirm PM tidy ${mutation} for eligible datasets? [y/N] `);
    const reader = createInterface({ input, output });
    reader.once("line", (answer) => {
      reader.close();
      resolve(/^y(?:es)?$/i.test(answer.trim()));
    });
  });
}

export const pmCommand: Command = {
  name: "pm",
  usage: "pm <status|tidy>",
  summary: "Inspect and maintain PM runtime state",
  splash: [{ usage: "pm status", summary: "Inspect PM session and delegations" }, { usage: "pm tidy", summary: "Preview or purge stale PM runtime data" }],
  run(argv) {
    if (argv[1] === "status") return runPmStatus(argv);
    if (argv[1] === "tidy") return runPmTidy(argv);
    throw new CliError("Usage: aix pm <status|tidy>", EXIT_USAGE);
  },
  async runInteractive(argv, context) {
    const mutation = argv.includes("--purge") ? "purge" : argv.includes("--apply") ? "apply" : argv.includes("--archive") ? "archive" : undefined;
    const interactive = "isTTY" in context.input && context.input.isTTY === true && "isTTY" in context.output && context.output.isTTY === true;
    if (mutation && interactive) {
      const preview = runPmTidy(argv.filter((arg) => arg !== "--archive" && arg !== "--apply" && arg !== "--purge"));
      if (!(await confirm(context.input, context.output, mutation))) return { exitCode: 0, stdout: `${preview.stdout}\nNo changes made.` };
    }
    return runPmTidy(argv);
  }
};
