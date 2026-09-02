import { readLockfileJson } from "../../../activation/lockfile.js";
import { listDelegations } from "../../../pm/delegation.js";
import { readPmSession } from "../../../pm/session.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

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

export const pmCommand: Command = {
  name: "pm",
  usage: "pm status",
  summary: "Inspect PM session and delegation state",
  splash: [{ usage: "pm status", summary: "Inspect PM session and delegations" }],
  run(argv) {
    if (argv[1] !== "status") throw new CliError("Usage: aix pm status", EXIT_USAGE);
    return runPmStatus(argv);
  }
};
