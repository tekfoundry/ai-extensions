import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { listDelegations } from "../pm/delegation.js";
import { assertPmRuntimePath, delegationPaths, pmRuntimePaths } from "../pm/paths.js";
import { writePmJsonAtomic } from "../pm/records.js";
import { readWorkspace } from "../pm/workspace.js";
import type { DelegationRecord } from "../pm/delegation.js";

const ACTIVE_STATES = new Set(["created", "dispatched", "working", "needs-decision", "blocked", "paused", "unknown", "host-lost"]);

export interface WorkflowPmDataset {
  record: DelegationRecord;
  unlanded: boolean;
}

export function workflowPmDatasets(projectRoot: string, workflowName: string): WorkflowPmDataset[] {
  return listDelegations(projectRoot)
    .filter((record) => record.contract.workflow === workflowName)
    .map((record) => {
      const paths = delegationPaths(projectRoot, record.contract.identity.delegationId);
      const workspace = existsSync(paths.workspace) ? readWorkspace(projectRoot, record.contract.identity.delegationId) : undefined;
      return { record, unlanded: Boolean(workspace && workspace.state !== "cleaned" && workspace.state !== "integrated") };
    });
}

export function workflowPmWarning(datasets: WorkflowPmDataset[]): WorkflowPmDataset[] {
  return datasets.filter(({ record, unlanded }) => unlanded || ACTIVE_STATES.has(record.state));
}

export function deleteWorkflowPmDatasets(projectRoot: string, workflowName: string): string[] {
  const datasets = workflowPmWarning(workflowPmDatasets(projectRoot, workflowName));
  const deleted: string[] = [];
  const worktreeDiscovery = (() => {
    try {
      const paths = execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: projectRoot, encoding: "utf8" })
        .split(/\r?\n(?=worktree )/)
        .map((entry) => entry.match(/^worktree (.+)$/m)?.[1])
        .filter((path): path is string => Boolean(path));
      return { available: true, paths };
    } catch {
      return { available: false, paths: [] as string[] };
    }
  })();
  for (const { record } of datasets) {
    const delegationId = record.contract.identity.delegationId;
    const paths = delegationPaths(projectRoot, delegationId);
    assertPmRuntimePath(projectRoot, paths.root);
    if (existsSync(paths.workspace)) {
      assertPmRuntimePath(projectRoot, paths.workspace);
      if (!worktreeDiscovery.available) {
        throw new AixError(`Cannot safely clean registered PM workspace without Git worktree discovery: ${paths.workspace}`);
      }
      if (worktreeDiscovery.paths.includes(paths.workspace)) {
        execFileSync("git", ["worktree", "remove", "--force", paths.workspace], { cwd: projectRoot, stdio: "ignore" });
      } else {
        rmSync(paths.workspace, { recursive: true, force: false });
      }
    }
    if (existsSync(paths.root)) {
      rmSync(paths.root, { recursive: true, force: false });
      deleted.push(delegationId);
    }
  }

  const indexPath = join(pmRuntimePaths(projectRoot).delegations, "index.json");
  if (deleted.length > 0 && existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as { delegations?: string[] };
    writePmJsonAtomic(indexPath, {
      updatedAt: new Date().toISOString(),
      delegations: (index.delegations || []).filter((id) => !deleted.includes(id))
    });
  }
  return deleted;
}

export function assertWorkflowPmDeactivationAllowed(projectRoot: string, workflowName: string, confirmed = false): void {
  const warning = workflowPmWarning(workflowPmDatasets(projectRoot, workflowName));
  if (warning.length > 0 && !confirmed) {
    throw new AixError(`Workflow ${workflowName} has ${warning.length} active or unlanded PM delegation dataset(s); explicit confirmation is required before uninstall.`);
  }
}
