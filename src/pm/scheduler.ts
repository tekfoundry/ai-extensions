import { createHash } from "node:crypto";
import { AixError } from "../errors.js";
import type { HostCapabilitySnapshot, HostConcurrencyReport } from "./host.js";

export type SchedulerTaskMode = "read-only" | "change-producing";
export type SchedulerDecision = "active" | "queued";
export type SchedulerDecisionKind = "parallel" | "grouped" | "split" | "queued" | "serialized" | "held" | "recovery";

export interface SchedulerTask {
  id: string;
  /** Tasks in one group are intentionally sequential and retain shared context. */
  groupId: string;
  dependencies?: string[];
  mode: SchedulerTaskMode;
  writeDomains?: string[];
  sharedArtifacts?: string[];
  requiresIntegration?: boolean;
  serialization?: "none" | "group" | "shared-artifact" | "integration";
}

export interface SchedulerTaskGroup {
  groupId: string;
  taskIds: string[];
  rationale: string;
  decisionKind: "grouped" | "split";
}

export interface TaskGroupFormation {
  groupId: string;
  rationale: string;
  decisionKind: "grouped" | "split";
}

/**
 * Derive canonical groups from a plan/task graph. Caller-provided group IDs
 * are intentionally not used here: dependencies, claims, and serialization
 * policy are the authoritative grouping evidence.
 */
export function formTaskGroups(tasks: readonly SchedulerTask[]): SchedulerTaskGroup[] {
  validateTasks(tasks);
  const parent = new Map(tasks.map((task) => [task.id, task.id]));
  const find = (id: string): string => {
    const root = parent.get(id);
    if (!root || root === id) return id;
    const resolved = find(root);
    parent.set(id, resolved);
    return resolved;
  };
  const join = (left: string, right: string): void => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(b, a);
  };
  for (const task of tasks) {
    for (const dependency of task.dependencies || []) join(task.id, dependency);
  }
  for (let index = 0; index < tasks.length; index += 1) {
    for (let next = index + 1; next < tasks.length; next += 1) {
      const left = tasks[index];
      const right = tasks[next];
      if ((left.serialization !== undefined && left.serialization !== "none") || (right.serialization !== undefined && right.serialization !== "none") || domainsOverlap(left, right) || sharedArtifactsOverlap(left, right)) join(left.id, right.id);
    }
  }
  const groups = new Map<string, SchedulerTask[]>();
  for (const task of tasks) {
    const root = find(task.id);
    const group = groups.get(root) || [];
    group.push(task);
    groups.set(root, group);
  }
  return [...groups.values()].map((group) => {
    const related = group.length > 1;
    const relationships = group.flatMap((task) => [
      ...(task.dependencies || []).map((dependency) => `dependency:${dependency}`),
      ...(task.sharedArtifacts || []).map((artifact) => `shared:${artifact}`),
      ...(task.writeDomains || []).map((domain) => `scope:${domain}`),
      ...(task.serialization && task.serialization !== "none" ? [`policy:${task.serialization}`] : [])
    ]).sort();
    const digest = createHash("sha256").update(group.map((task) => task.id).sort().join("\n")).digest("hex").slice(0, 12);
    return {
      groupId: `group-${digest}`,
      taskIds: group.map((task) => task.id),
      decisionKind: related ? "grouped" : "split",
      rationale: related
        ? `PM grouped these tasks from canonical plan relationships: ${relationships.join(", ")}.`
        : "PM split this task into its own group because no dependency, overlapping scope, shared artifact, or serialization relationship was declared."
    };
  });
}

export function formTaskGroup(input: {
  role: string;
  taskMode: string;
  requestedGroupId?: string;
  dependencies?: string[];
  sharedArtifacts?: string[];
  writeDomains?: string[];
  serialization?: "none" | "group" | "shared-artifact" | "integration";
}): TaskGroupFormation {
  const relationship = [
    ...(input.dependencies || []).map((item) => `dependency:${item}`),
    ...(input.sharedArtifacts || []).map((item) => `shared:${item}`),
    ...(input.writeDomains || []).map((item) => `scope:${item}`)
  ].sort();
  if (input.requestedGroupId && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.requestedGroupId)) {
    throw new AixError("Task group ID must be a safe identifier.");
  }
  const policy = input.serialization && input.serialization !== "none" ? `policy:${input.serialization}` : undefined;
  const derivedRelationships = policy ? [...relationship, policy].sort() : relationship;
  // A relation-free assignment is intentionally split, so a caller token may
  // provide uniqueness without becoming an authoritative grouping decision.
  const uniquenessSalt = !relationship.length && !policy && input.requestedGroupId ? `caller:${input.requestedGroupId}` : undefined;
  const digest = createHash("sha256").update([input.role, input.taskMode, ...derivedRelationships, ...(uniquenessSalt ? [uniquenessSalt] : [])].join("\n")).digest("hex").slice(0, 12);
  const normalizedRequest = input.requestedGroupId ? ` Caller group ${input.requestedGroupId} was normalized to this PM-derived group.` : "";
  return {
    groupId: `group-${digest}`,
    decisionKind: relationship.length > 0 || Boolean(policy) ? "grouped" : "split",
    rationale: relationship.length > 0 || Boolean(policy)
      ? `PM formed this cohesive group from the role/task mode and related ${derivedRelationships.join(", ")} relationships.${normalizedRequest}`
      : `PM split this assignment into its own group because no dependency or shared-resource relationship or serialization policy was declared.${normalizedRequest}`
  };
}

export interface SchedulerState {
  task: SchedulerTask;
  decision: SchedulerDecision;
  reason?: string;
  rationale?: string;
  decisionKind?: SchedulerDecisionKind;
}

export function taskForDelegation(input: {
  id: string;
  groupId: string;
  mode: SchedulerTaskMode;
  dependencies?: string[];
  writeDomains?: string[];
  sharedArtifacts?: string[];
  requiresIntegration?: boolean;
  serialization?: "none" | "group" | "shared-artifact" | "integration";
}): SchedulerTask {
  return {
    id: input.id,
    groupId: input.groupId,
    mode: input.mode,
    dependencies: input.dependencies || [],
    writeDomains: input.writeDomains || [],
    sharedArtifacts: input.sharedArtifacts || [],
    ...(input.requiresIntegration === undefined ? {} : { requiresIntegration: input.requiresIntegration })
    , ...(input.serialization === undefined ? {} : { serialization: input.serialization })
  };
}

export interface SchedulerOptions {
  capabilities?: HostCapabilitySnapshot;
  concurrency?: number;
  concurrencyReport?: HostConcurrencyReport;
}

export interface TaskScheduler {
  readonly concurrency: number;
  refreshCapacity(report: HostConcurrencyReport, localActive?: number): number;
  admit(task: SchedulerTask, active?: readonly SchedulerTask[]): SchedulerState;
  admitIntegration(task: SchedulerTask, activeIntegrations?: readonly SchedulerTask[]): SchedulerState;
  plan(tasks: readonly SchedulerTask[]): SchedulerState[];
  run<T>(tasks: readonly SchedulerTask[], worker: (task: SchedulerTask) => Promise<T>): Promise<Map<string, T>>;
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function pathsOverlap(left: string, right: string): boolean {
  const a = normalizePath(left);
  const b = normalizePath(right);
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function domainsOverlap(left: SchedulerTask, right: SchedulerTask): boolean {
  return (left.writeDomains || []).some((leftDomain) => (right.writeDomains || []).some((rightDomain) => pathsOverlap(leftDomain, rightDomain)))
    || (left.sharedArtifacts || []).some((leftArtifact) => (right.sharedArtifacts || []).some((rightArtifact) => pathsOverlap(leftArtifact, rightArtifact)))
    || (left.sharedArtifacts || []).some((artifact) => (right.writeDomains || []).some((domain) => pathsOverlap(artifact, domain)))
    || (right.sharedArtifacts || []).some((artifact) => (left.writeDomains || []).some((domain) => pathsOverlap(artifact, domain)));
}

function sharedArtifactsOverlap(left: SchedulerTask, right: SchedulerTask): boolean {
  return (left.sharedArtifacts || []).some((artifact) => (right.sharedArtifacts || []).some((candidate) => pathsOverlap(artifact, candidate)));
}

function validateTasks(tasks: readonly SchedulerTask[]): void {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (!task.id || !task.groupId) throw new AixError("Scheduler tasks require stable id and groupId values.");
    if (ids.has(task.id)) throw new AixError(`Scheduler task ${task.id} is duplicated.`);
    ids.add(task.id);
    if (task.mode === "change-producing" && (task.writeDomains || []).length === 0) {
      throw new AixError(`Change-producing task ${task.id} must declare writeDomains.`);
    }
  }
  for (const task of tasks) {
    for (const dependency of task.dependencies || []) {
      if (!ids.has(dependency)) throw new AixError(`Scheduler task ${task.id} depends on unknown task ${dependency}.`);
      if (dependency === task.id) throw new AixError(`Scheduler task ${task.id} cannot depend on itself.`);
    }
  }
}

function capabilityAllowsChange(options: SchedulerOptions): boolean {
  const capabilities = options.capabilities?.capabilities;
  if (!capabilities) return true;
  return capabilities["managed-local-integration"] === true
    && capabilities["workspace-binding"] === true;
}

function capacityFromReport(report: HostConcurrencyReport, localActive = 0): number {
    const { active, limit } = report;
    if (!Number.isInteger(active) || active < 0 || (limit !== undefined && (!Number.isInteger(limit) || limit < 1))) {
      throw new AixError("Scheduler host concurrency report is invalid.");
    }
    if (limit === undefined) return 1;
    return Math.max(0, limit - Math.max(0, active - localActive));
}

function capacityFrom(options: SchedulerOptions): number {
  if (options.concurrencyReport) return capacityFromReport(options.concurrencyReport);
  const requested = options.concurrency ?? 1;
  if (!Number.isInteger(requested) || requested < 1) throw new AixError("Scheduler concurrency must be a positive integer.");
  return requested;
}

export function createTaskScheduler(options: SchedulerOptions = {}): TaskScheduler {
  let concurrency = capacityFrom(options);

  function refreshCapacity(report: HostConcurrencyReport, localActive = 0): number {
    concurrency = capacityFromReport(report, localActive);
    return concurrency;
  }

  function admit(task: SchedulerTask, active: readonly SchedulerTask[] = []): SchedulerState {
    if (task.mode === "change-producing" && !capabilityAllowsChange(options)) {
      return { task, decision: "queued", decisionKind: "held", reason: "host lacks explicit managed integration or workspace isolation capabilities" };
    }
    if (active.length >= concurrency) return { task, decision: "queued", decisionKind: "queued", reason: `host concurrency limit reached (${concurrency})` };
    if (active.some((candidate) => candidate.groupId === task.groupId)) {
      return { task, decision: "queued", decisionKind: "serialized", reason: `task group ${task.groupId} is already active` };
    }
    if (active.some((candidate) => (task.mode === "change-producing" && candidate.mode === "change-producing" && domainsOverlap(candidate, task)) || sharedArtifactsOverlap(candidate, task))) {
      return { task, decision: "queued", decisionKind: "serialized", reason: "declared write domains or shared artifacts overlap an active change-producing task" };
    }
    return { task, decision: "active", decisionKind: active.length > 0 ? "parallel" : (task.serialization === "group" ? "grouped" : "parallel") };
  }

  function admitIntegration(task: SchedulerTask, activeIntegrations: readonly SchedulerTask[] = []): SchedulerState {
    if (!task.requiresIntegration) return { task, decision: "active", decisionKind: "parallel" };
    if (activeIntegrations.length > 0) return { task, decision: "queued", decisionKind: "serialized", reason: "parent-workspace integration is serialized" };
    return { task, decision: "active", decisionKind: "grouped" };
  }

  function plan(tasks: readonly SchedulerTask[]): SchedulerState[] {
    validateTasks(tasks);
    const states: SchedulerState[] = [];
    const stateById = new Map<string, SchedulerState>();
    const active: SchedulerTask[] = [];
    for (const task of tasks) {
      const dependenciesReady = (task.dependencies || []).every((dependency) => stateById.get(dependency)?.decision === "active");
      if (!dependenciesReady) {
        const state = { task, decision: "queued" as const, decisionKind: "queued" as const, reason: "dependency is not complete" };
        states.push(state);
        stateById.set(task.id, state);
        continue;
      }
      const state = admit(task, active);
      states.push(state);
      stateById.set(task.id, state);
      if (state.decision === "active") active.push(task);
    }
    return states;
  }

  async function run<T>(tasks: readonly SchedulerTask[], worker: (task: SchedulerTask) => Promise<T>): Promise<Map<string, T>> {
    validateTasks(tasks);
    const pending = new Map(tasks.map((task) => [task.id, task]));
    const active = new Map<string, Promise<void>>();
    const activeTasks = new Map<string, SchedulerTask>();
    const results = new Map<string, T>();
    const finished = new Set<string>();

    while (pending.size > 0 || active.size > 0) {
      let started = false;
      for (const task of pending.values()) {
        if (!(task.dependencies || []).every((dependency) => finished.has(dependency))) continue;
        const state = admit(task, [...activeTasks.values()]);
        if (state.decision === "queued") continue;
        pending.delete(task.id);
        const operation = worker(task).then((result) => { results.set(task.id, result); finished.add(task.id); }).finally(() => { active.delete(task.id); activeTasks.delete(task.id); });
        active.set(task.id, operation);
        activeTasks.set(task.id, task);
        started = true;
      }
      if (active.size === 0) {
        if (!started) throw new AixError("Scheduler cannot make progress; tasks have conflicting or cyclic dependencies.");
        continue;
      }
      await Promise.race(active.values());
    }
    return results;
  }

  return { get concurrency() { return concurrency; }, refreshCapacity, admit, admitIntegration, plan, run };
}
