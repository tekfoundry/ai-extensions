import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { delegationPaths, ensurePmRuntimeLayout, pmRuntimePaths } from "./paths.js";
import { writePmJsonAtomic, writePmTextAtomic } from "./records.js";
import { utcTimestamp } from "./time.js";
import { assertNoRawSecrets, validateDelegationContract, validateDelegationState } from "./validation.js";
import type { DelegationContract, DelegationState, TaskMode, DeliveryMode } from "./types.js";

export interface CreateDelegationInput {
  projectRoot?: string;
  workflow: string;
  workflowVersion: string;
  pmRoleVersion: string;
  role: string;
  displayName?: string;
  taskMode: TaskMode;
  deliveryMode: DeliveryMode;
  goal: string;
  constraints: string[];
  acceptanceSignals: string[];
  allowedPaths: string[];
  deniedPaths: string[];
  requiredAccess: string[];
  stopConditions: string[];
  returnRequirements: string[];
  teamVersion?: string;
}

export interface DelegationRecord {
  contract: DelegationContract;
  state: DelegationState;
  createdAt: string;
  updatedAt: string;
  teamVersion?: string;
  goal: string;
  constraints: string[];
  acceptanceSignals: string[];
  returnRequirements: string[];
}

export function createDelegation(input: CreateDelegationInput): DelegationRecord {
  const projectRoot = input.projectRoot || process.cwd();
  const runtime = ensurePmRuntimeLayout(projectRoot);
  const delegationId = `delegation-${randomUUID()}`;
  const subagentId = `subagent-${randomUUID()}`;
  const createdAt = utcTimestamp();
  const paths = delegationPaths(projectRoot, delegationId);
  const record: DelegationRecord = {
    contract: validateDelegationContract({
      recordSchemaVersion: 1,
      protocolVersion: 1,
      workflow: input.workflow,
      workflowVersion: input.workflowVersion,
      pmRoleVersion: input.pmRoleVersion,
      identity: {
        subagentId,
        delegationId,
        displayName: input.displayName || `${input.role} worker`
      },
      authority: {
        role: input.role,
        taskMode: input.taskMode,
        deliveryMode: input.deliveryMode,
        allowedPaths: input.allowedPaths,
        deniedPaths: input.deniedPaths,
        requiredAccess: input.requiredAccess,
        stopConditions: input.stopConditions
      }
    }),
    state: "created",
    createdAt,
    updatedAt: createdAt,
    ...(input.teamVersion ? { teamVersion: input.teamVersion } : {}),
    goal: input.goal,
    constraints: input.constraints,
    acceptanceSignals: input.acceptanceSignals,
    returnRequirements: input.returnRequirements
  };
  assertNoRawSecrets(record);
  writePmJsonAtomic(join(paths.root, "record.json"), record);
  writePmTextAtomic(paths.brief, renderBrief(record));
  const indexPath = join(runtime.delegations, "index.json");
  const previousIndex = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) as { delegations?: string[] } : {};
  writePmJsonAtomic(indexPath, { updatedAt: createdAt, delegations: [...(previousIndex.delegations || []), delegationId] });
  appendEvent(projectRoot, record, "dispatch", "pm");
  return record;
}

function renderBrief(record: DelegationRecord): string {
  const authority = record.contract.authority;
  return [
    `# Delegation: ${record.contract.identity.displayName}`,
    "",
    `- delegation_id: ${record.contract.identity.delegationId}`,
    `- subagent_id: ${record.contract.identity.subagentId}`,
    `- role: ${authority.role}`,
    `- task_mode: ${authority.taskMode}`,
    `- delivery_mode: ${authority.deliveryMode}`,
    `- protocol_version: ${record.contract.protocolVersion}`,
    "",
    "## Goal",
    "",
    record.goal,
    "",
    "## Constraints",
    "",
    ...record.constraints.map((item) => `- ${item}`),
    "",
    "## Acceptance signals",
    "",
    ...record.acceptanceSignals.map((item) => `- ${item}`),
    "",
    "## Write scope",
    "",
    `Allowed: ${authority.allowedPaths.join(", ") || "none"}`,
    `Denied: ${authority.deniedPaths.join(", ") || "none"}`,
    "",
    "## Return requirements",
    "",
    ...record.returnRequirements.map((item) => `- ${item}`)
  ].join("\n");
}

export function appendEvent(projectRoot: string, record: DelegationRecord, type: string, source: "pm" | "worker" | "provider" | "aix", data: Record<string, unknown> = {}): void {
  assertNoRawSecrets(data);
  const paths = delegationPaths(projectRoot, record.contract.identity.delegationId);
  const event = {
    eventId: `event-${randomUUID()}`,
    delegationId: record.contract.identity.delegationId,
    subagentId: record.contract.identity.subagentId,
    sequence: readEventCount(paths.events) + 1,
    timestamp: utcTimestamp(),
    source,
    type,
    ...data
  };
  assertNoRawSecrets(event);
  const existing = existsSync(paths.events) ? readFileSync(paths.events, "utf8") : "";
  writePmTextAtomic(paths.events, `${existing}${JSON.stringify(event)}\n`);
}

function readEventCount(path: string): number {
  return existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).length : 0;
}

export function publishWorkerStatus(projectRoot: string, delegationId: string, state: DelegationState, summary: string): DelegationRecord {
  const record = readDelegation(projectRoot, delegationId);
  const nextState = validateDelegationState(state);
  if (nextState === "created") throw new Error("Worker cannot publish created state.");
  record.state = nextState;
  record.updatedAt = utcTimestamp();
  writePmJsonAtomic(join(delegationPaths(projectRoot, delegationId).root, "record.json"), record);
  const paths = delegationPaths(projectRoot, delegationId);
  const existing = existsSync(paths.status) ? readFileSync(paths.status, "utf8") : "";
  writePmTextAtomic(paths.status, `${existing}${JSON.stringify({ timestamp: record.updatedAt, state: nextState, summary })}\n`);
  appendEvent(projectRoot, record, "status", "worker", { state: nextState, summary });
  return record;
}

export function acceptDelegation(projectRoot: string, delegationId: string, summary = "Worker accepted the delegation."): DelegationRecord {
  const record = readDelegation(projectRoot, delegationId);
  record.state = "dispatched";
  record.updatedAt = utcTimestamp();
  writePmJsonAtomic(join(delegationPaths(projectRoot, delegationId).root, "record.json"), record);
  appendEvent(projectRoot, record, "acceptance", "worker", { summary });
  return record;
}

export function publishWorkerQuestion(projectRoot: string, delegationId: string, question: string): DelegationRecord {
  const record = readDelegation(projectRoot, delegationId);
  record.state = "needs-decision";
  record.updatedAt = utcTimestamp();
  writePmJsonAtomic(join(delegationPaths(projectRoot, delegationId).root, "record.json"), record);
  appendEvent(projectRoot, record, "question", "worker", { question });
  return record;
}

export function publishWorkerResult(projectRoot: string, delegationId: string, result: { summary: string; evidence: string[]; gaps: string[]; residualRisk: string[]; status: "completed" | "blocked" | "failed" }): DelegationRecord {
  assertNoRawSecrets(result);
  const record = readDelegation(projectRoot, delegationId);
  const paths = delegationPaths(projectRoot, delegationId);
  record.state = result.status;
  record.updatedAt = utcTimestamp();
  writePmTextAtomic(paths.result, ["# Worker result", "", result.summary, "", "## Evidence", "", ...result.evidence.map((item) => `- ${item}`), "", "## Gaps", "", ...result.gaps.map((item) => `- ${item}`), "", "## Residual risk", "", ...result.residualRisk.map((item) => `- ${item}`)].join("\n"));
  writePmJsonAtomic(join(paths.root, "record.json"), record);
  appendEvent(projectRoot, record, "result", "worker", { status: result.status });
  return record;
}

export function readDelegation(projectRoot: string, delegationId: string): DelegationRecord {
  const path = join(delegationPaths(projectRoot, delegationId).root, "record.json");
  return JSON.parse(readFileSync(path, "utf8")) as DelegationRecord;
}

export function attachHostWorker(projectRoot: string, delegationId: string, hostWorkerId: string): DelegationRecord {
  const record = readDelegation(projectRoot, delegationId);
  record.contract.identity.hostWorkerId = hostWorkerId;
  record.updatedAt = utcTimestamp();
  assertNoRawSecrets(record);
  writePmJsonAtomic(join(delegationPaths(projectRoot, delegationId).root, "record.json"), record);
  appendEvent(projectRoot, record, "worker-created", "provider", { hostWorkerId });
  return record;
}

export function updateDelegationState(projectRoot: string, delegationId: string, state: DelegationState, summary?: string, source: "pm" | "provider" | "aix" = "pm"): DelegationRecord {
  const record = readDelegation(projectRoot, delegationId);
  record.state = validateDelegationState(state);
  record.updatedAt = utcTimestamp();
  writePmJsonAtomic(join(delegationPaths(projectRoot, delegationId).root, "record.json"), record);
  appendEvent(projectRoot, record, "state", source, { state: record.state, ...(summary ? { summary } : {}) });
  return record;
}

export function listDelegations(projectRoot = process.cwd()): DelegationRecord[] {
  const root = pmRuntimePaths(projectRoot).delegations;
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "record.json"))).map((entry) => readDelegation(projectRoot, entry.name));
}
