import { existsSync } from "node:fs";
import { join } from "node:path";
import { readLockfileJson } from "../activation/lockfile.js";
import { AixError } from "../errors.js";
import { roleEntrypointPath } from "../paths/agents.js";
import { readWorkflowManifest } from "../workflows/manifest.js";
import { loadWorkerContext, loadWorkflowTeamContext } from "./context.js";
import {
  acceptDelegation,
  appendEvent,
  attachHostWorker,
  createDelegation,
  listDelegations,
  publishWorkerResult,
  publishWorkerStatus,
  readDelegation,
  updateDelegationState,
  type CreateDelegationInput,
  type DelegationRecord
} from "./delegation.js";
import { acquirePmLock, waitForPmLock } from "./locks.js";
import { createDiagnosticLogger, type DiagnosticLogger } from "./diagnostics.js";
import { assertHostCapabilities, createPersistedCapabilitySnapshot, MANAGED_LOCAL_INTEGRATION_CAPABILITY, type HostExecution, type HostWorkerHandle, type HostWorkerRequest, type HostWorkerResult } from "./host.js";
import { startPmSession, updatePmSession, type PmSessionHandle } from "./session.js";
import type { DeliveryMode, TaskMode } from "./types.js";
import { createTaskScheduler, formTaskGroup, taskForDelegation, type SchedulerTask } from "./scheduler.js";
import { pmRuntimePaths } from "./paths.js";
import { createGitWorkspaceManager, readWorkspace, type WorkspaceManager, type WorkspaceRecord } from "./workspace.js";

export interface PmOrchestratorOptions {
  projectRoot?: string;
  host: HostExecution;
  workspaceManager?: WorkspaceManager;
  /** Test/integration hook; production resolves the active workflow lock entry. */
  workflowPackageRoot?: string;
  now?: () => string;
  verbose?: boolean;
}

export interface PmOrchestrator {
  readonly session: PmSessionHandle;
  readonly workflow: ReturnType<typeof readWorkflowManifest>;
  readonly team: ReturnType<typeof loadWorkflowTeamContext>["team"];
  readonly capabilities: Awaited<ReturnType<HostExecution["discoverCapabilities"]>>;
  dispatch(input: Omit<CreateDelegationInput, "projectRoot" | "workflow" | "workflowVersion" | "pmRoleVersion" | "teamVersion" | "role" | "displayName" | "taskMode" | "deliveryMode" | "allowedPaths" | "deniedPaths"> & {
    role: string;
    taskMode: TaskMode;
    deliveryMode: DeliveryMode;
    displayName?: string;
    reuseKey?: string;
    roleDirectory?: string;
    allowedPaths?: string[];
    deniedPaths?: string[];
    requiredAccess?: string[];
    stopConditions?: string[];
    groupId?: string;
    dependencies?: string[];
    sharedArtifacts?: string[];
    groupRationale?: string;
  }): Promise<DelegationRunResult>;
  reconcile(): Promise<RecoveryNotice[]>;
  recover(delegationId: string, action: "follow-up" | "pause" | "stop" | "retry" | "redirect" | "repair" | "verify" | "escalate"): Promise<DelegationRecord>;
  status(): PmStatus;
  close(): void;
}

export interface DelegationRunResult {
  record: DelegationRecord;
  worker: HostWorkerHandle;
  reused: boolean;
  report: DelegationReport;
}

export interface DelegationReport {
  role: string;
  delegationId: string;
  subagentId: string;
  hostWorkerId: string;
  displayName: string;
  hostDisplayName?: string;
  status: HostWorkerResult["status"];
  summary: string;
}

export function createDelegationReport(record: DelegationRecord, worker: HostWorkerHandle, result: HostWorkerResult): DelegationReport {
  return {
    role: record.contract.authority.role,
    delegationId: record.contract.identity.delegationId,
    subagentId: record.contract.identity.subagentId,
    hostWorkerId: worker.hostWorkerId,
    displayName: record.contract.identity.displayName,
    ...(worker.hostDisplayName ? { hostDisplayName: worker.hostDisplayName } : {}),
    status: result.status,
    summary: result.result
  };
}
export interface RecoveryNotice {
  delegationId: string;
  previousState: string;
  state: "host-lost" | "unknown";
  reason: string;
}

export interface PmStatus {
  sessionId: string;
  leaseExpiresAt: string;
  workflow: string;
  workflowVersion: string;
  capabilities: Record<string, boolean | "unknown">;
  host: { provider: string; harness: string; model: string; runtime: string };
  delegations: Array<{ delegationId: string; subagentId: string; displayName: string; role: string; state: string; updatedAt: string; groupId?: string; schedulingDecision?: string; schedulingReason?: string; groupRationale?: string; capabilitySnapshot?: DelegationRecord["capabilitySnapshot"] }>;
}

export function assertPmArtifactWriteForbidden(candidatePath: string): never {
  throw new AixError(`PM and parent contexts cannot directly modify project artifacts: ${candidatePath}`);
}

export function requiredHostCapabilitiesForDeliveryMode(deliveryMode: DeliveryMode): readonly string[] {
  return deliveryMode === "report-only" ? [] : [MANAGED_LOCAL_INTEGRATION_CAPABILITY];
}

function activeWorkflow(projectRoot: string, workflowPackageRoot?: string) {
  if (workflowPackageRoot) {
    const manifest = readWorkflowManifest(workflowPackageRoot);
    return { lock: { packagePath: workflowPackageRoot, name: manifest.name, resolvedCommit: "1", team: manifest.team ? { path: manifest.team.path, version: manifest.team.version } : undefined }, manifest, packageRoot: workflowPackageRoot };
  }
  const workflow = readLockfileJson().workflows?.[0];
  if (!workflow) throw new AixError("No active workflow. Install and activate a PM-enabled workflow first.");
  if (!existsSync(workflow.packagePath)) throw new AixError(`Active workflow package is missing: ${workflow.packagePath}`);
  return { lock: workflow, manifest: readWorkflowManifest(workflow.packagePath), packageRoot: workflow.packagePath };
}

function getPmRoleVersion(): string {
  return readLockfileJson().roles?.find((role) => role.activeName === "project-manager")?.resolvedCommit || "1";
}

function pathInDeclaredDomain(path: string, domains: string[]): boolean {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  return domains.some((domain) => {
    const prefix = domain.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
    return prefix !== "" && (normalized === prefix || normalized.startsWith(`${prefix}/`));
  });
}

function loggerFor(projectRoot: string, verbose: boolean): DiagnosticLogger {
  return createDiagnosticLogger(join(pmRuntimePaths(projectRoot).diagnostics, "pm.jsonl"), { minLevel: verbose ? "debug" : "info" });
}

export async function createPmOrchestrator(options: PmOrchestratorOptions): Promise<PmOrchestrator> {
  const projectRoot = options.projectRoot || process.cwd();
  const active = activeWorkflow(projectRoot, options.workflowPackageRoot);
  const teamContext = loadWorkflowTeamContext(active.packageRoot);
  const session = startPmSession({ projectRoot, workflow: active.manifest.name, workflowVersion: active.lock.resolvedCommit || "1", now: options.now });
  const logger = loggerFor(projectRoot, options.verbose === true);
  const capabilities = await options.host.discoverCapabilities();
  const concurrencyReport = options.host.reportConcurrency ? await options.host.reportConcurrency() : undefined;
  const scheduler = createTaskScheduler({ capabilities, concurrencyReport });
  updatePmSession(projectRoot, session.record.sessionId, { capabilitySnapshot: capabilities });
  const required = [...(active.manifest.requiredCapabilities || []), ...teamContext.team.requiredCapabilities];
  assertHostCapabilities(capabilities, [...new Set(required)]);
  logger.info("PM session started", { sessionId: session.record.sessionId }, { workflow: active.manifest.name, harness: capabilities.harness, provider: capabilities.provider, model: capabilities.model });
  const reusableWorkers = new Map<string, { worker: HostWorkerHandle; role: string; taskMode: TaskMode; deliveryMode: DeliveryMode }>();
  const activeTasks = new Map<string, SchedulerTask>();
  let integrationTail: Promise<void> = Promise.resolve();
  let integrationActive = false;

  async function waitForAdmission(task: SchedulerTask, record: DelegationRecord): Promise<void> {
    let wasQueued = false;
    while (true) {
      if (options.host.reportConcurrency) {
        const report = await options.host.reportConcurrency();
        scheduler.refreshCapacity(report, activeTasks.size);
      }
      const dependenciesReady = (task.dependencies || []).every((dependency) => {
        try { return ["completed"].includes(readDelegation(projectRoot, dependency).state); } catch { return false; }
      });
      const state = dependenciesReady ? scheduler.admit(task, [...activeTasks.values()]) : { task, decision: "queued" as const, reason: "dependency is not complete" };
      if (state.decision === "active") {
        if (wasQueued) {
          updateDelegationState(projectRoot, record.contract.identity.delegationId, "dispatched", "Scheduler admitted the queued delegation.", "pm");
          logger.info("Queued delegation admitted", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId }, { groupId: task.groupId });
        }
        const admitted = readDelegation(projectRoot, record.contract.identity.delegationId);
        appendEvent(projectRoot, admitted, "scheduler-decision", "pm", { decision: state.decisionKind || "parallel", groupId: task.groupId, mode: task.mode, dependencies: task.dependencies || [], writeDomains: task.writeDomains || [], sharedArtifacts: task.sharedArtifacts || [], ...(state.reason ? { reason: state.reason } : {}), rationale: admitted.scheduling?.rationale || "PM admitted the task using scheduler policy." });
        activeTasks.set(task.id, task);
        return;
      }
      if (!wasQueued) {
        wasQueued = true;
        const queued = updateDelegationState(projectRoot, record.contract.identity.delegationId, "queued", `Scheduler queued delegation: ${state.reason}.`, "pm");
        appendEvent(projectRoot, queued, "scheduler-queued", "pm", { decision: state.decisionKind || "queued", groupId: task.groupId, mode: task.mode, dependencies: task.dependencies || [], writeDomains: task.writeDomains || [], sharedArtifacts: task.sharedArtifacts || [], reason: state.reason, rationale: queued.scheduling?.rationale || "PM held the task under scheduler policy." });
        logger.info("Delegation queued", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId }, { groupId: task.groupId, reason: state.reason });
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  const orchestrator: PmOrchestrator = {
    session,
    workflow: active.manifest,
    team: teamContext.team,
    capabilities,
    async reconcile() {
      const notices: RecoveryNotice[] = [];
      const records = listDelegations(projectRoot);
      for (const record of records) {
        try {
          const workspace = readWorkspace(projectRoot, record.contract.identity.delegationId);
          if (workspace.state !== "cleaned" && ["completed", "integrated"].includes(record.state)) {
            updateDelegationState(projectRoot, record.contract.identity.delegationId, "blocked", "Unlanded isolated workspace requires PM reconciliation; cleanup is refused.", "aix");
            logger.warn("Unlanded workspace retained for recovery", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId }, { workspaceId: workspace.workspaceId, workspaceState: workspace.state });
          }
        } catch {
          // Delegations without a workspace record are normal for report-only work.
        }
        if (record.state === "queued") continue;
        if (["completed", "failed", "cancelled", "expired", "superseded"].includes(record.state)) continue;
        const hostWorkerId = record.contract.identity.hostWorkerId;
        if (!hostWorkerId) {
          updateDelegationState(projectRoot, record.contract.identity.delegationId, "unknown", "No host worker identity was persisted.", "aix");
          notices.push({ delegationId: record.contract.identity.delegationId, previousState: record.state, state: "unknown", reason: "missing host worker identity" });
          continue;
        }
        const state = await (options.host.inspectWorker
          ? options.host.inspectWorker({ subagentId: record.contract.identity.subagentId, hostWorkerId, ...(record.contract.identity.hostMissionId ? { hostMissionId: record.contract.identity.hostMissionId } : {}), ...(record.contract.identity.hostRunId ? { hostRunId: record.contract.identity.hostRunId } : {}), displayName: record.contract.identity.displayName })
          : Promise.resolve({ state: "unsupported" }));
        if (["unknown", "unsupported"].includes(state.state)) {
          updateDelegationState(projectRoot, record.contract.identity.delegationId, "host-lost", `Host could not confirm worker state: ${state.state}.`, "provider");
          notices.push({ delegationId: record.contract.identity.delegationId, previousState: record.state, state: "host-lost", reason: `host worker state was ${state.state}` });
        }
      }
      for (const record of records.filter((candidate) => candidate.state === "queued")) {
        const scheduling = record.scheduling;
        const unsafeWorkspace = records.some((candidate) => {
          try { return readWorkspace(projectRoot, candidate.contract.identity.delegationId).state !== "cleaned" && candidate.contract.authority.deliveryMode === "isolated-change"; } catch { return false; }
        });
        if (!scheduling || unsafeWorkspace || !(scheduling.dependencies || []).every((dependency) => {
          try { return readDelegation(projectRoot, dependency).state === "completed"; } catch { return false; }
        })) {
          updateDelegationState(projectRoot, record.contract.identity.delegationId, "blocked", unsafeWorkspace ? "Queued assignment held because isolated workspace state is unresolved." : "Queued assignment held because its restart prerequisites are incomplete.", "aix");
          logger.warn("Queued delegation held during restart reconciliation", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId }, { reason: unsafeWorkspace ? "unsafe workspace" : "incomplete prerequisites" });
          continue;
        }
        try {
          const resumed = await orchestrator.dispatch({
            role: record.contract.authority.role,
            taskMode: record.contract.authority.taskMode,
            deliveryMode: record.contract.authority.deliveryMode,
            displayName: record.contract.identity.displayName,
            groupId: scheduling.groupId,
            dependencies: scheduling.dependencies,
            sharedArtifacts: scheduling.sharedArtifacts,
            goal: record.goal,
            constraints: record.constraints,
            acceptanceSignals: record.acceptanceSignals,
            returnRequirements: record.returnRequirements,
            allowedPaths: record.contract.authority.allowedPaths,
            deniedPaths: record.contract.authority.deniedPaths,
            requiredAccess: record.contract.authority.requiredAccess,
            stopConditions: record.contract.authority.stopConditions
          });
          const superseded = updateDelegationState(projectRoot, record.contract.identity.delegationId, "superseded", `Resumed as ${resumed.record.contract.identity.delegationId} after PM restart.`, "aix");
          appendEvent(projectRoot, superseded, "restart-resumed", "aix", { replacementDelegationId: resumed.record.contract.identity.delegationId });
        } catch (error) {
          updateDelegationState(projectRoot, record.contract.identity.delegationId, "blocked", `Queued assignment could not be safely resumed: ${error instanceof Error ? error.message : String(error)}`, "aix");
        }
      }
      logger.info("PM recovery reconciliation completed", { sessionId: session.record.sessionId }, { notices: notices.length });
      return notices;
    },
    async dispatch(input) {
      let delegationId = "";
      session.refresh();
      const role = teamContext.team.roles.find((candidate) => candidate.name === input.role);
      if (!role || role.name === "project-manager") throw new AixError(`Role is not delegatable by this workflow: ${input.role}`);
      if (!role.taskModes.includes(input.taskMode)) throw new AixError(`Role ${input.role} does not support task mode ${input.taskMode}.`);
      if (!role.deliveryModes.includes(input.deliveryMode)) throw new AixError(`Role ${input.role} does not support delivery mode ${input.deliveryMode}.`);
      const requestedPaths = input.allowedPaths || role.writeDomains;
      if (requestedPaths.some((path) => !pathInDeclaredDomain(path, role.writeDomains))) {
        throw new AixError(`Delegation write scope exceeds the declared domain for role ${input.role}.`);
      }
      const deliveryCapabilities = requiredHostCapabilitiesForDeliveryMode(input.deliveryMode);
      assertHostCapabilities(capabilities, [...new Set([...role.requiredCapabilities, "native-worker-creation", "correlated-results", ...deliveryCapabilities])]);
      const release = acquirePmLock(projectRoot, `dispatch:${input.role}:${input.goal}`, session.record.sessionId);
      const artifactReleases: Array<() => void> = [];
      let createdRecord: DelegationRecord | undefined;
      let activeWorkspace: WorkspaceRecord | undefined;
      let activeWorker: HostWorkerHandle | undefined;
      try {
        delegationId = `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const sharedArtifacts = [...(role.sharedArtifacts || []), ...(input.sharedArtifacts || [])];
        if (role.readOnly && input.deliveryMode !== "report-only") throw new AixError(`Role ${role.name} is declared read-only and cannot receive change-producing work.`);
        const formation = formTaskGroup({ role: input.role, taskMode: input.taskMode, requestedGroupId: input.groupId, dependencies: input.dependencies, sharedArtifacts, writeDomains: requestedPaths, serialization: role.serialization });
        const task = taskForDelegation({
          id: delegationId,
          groupId: formation.groupId,
          dependencies: input.dependencies,
          mode: input.deliveryMode === "report-only" ? "read-only" : "change-producing",
          writeDomains: requestedPaths,
          sharedArtifacts,
          requiresIntegration: input.deliveryMode === "isolated-change"
          , serialization: role.serialization
        });
        const record = createDelegation({
          projectRoot,
          workflow: active.manifest.name,
          workflowVersion: active.lock.resolvedCommit || "1",
          pmRoleVersion: getPmRoleVersion(),
          teamVersion: active.lock.team?.version,
          role: input.role,
          displayName: input.displayName || role.displayName,
          taskMode: input.taskMode,
          deliveryMode: input.deliveryMode,
          goal: input.goal,
          constraints: input.constraints,
          acceptanceSignals: input.acceptanceSignals,
          returnRequirements: input.returnRequirements,
          allowedPaths: requestedPaths,
          deniedPaths: input.deniedPaths || role.deniedAreas,
          requiredAccess: input.requiredAccess || role.requiredCapabilities,
          stopConditions: input.stopConditions || ["Scope or authority is unclear."],
          capabilitySnapshot: createPersistedCapabilitySnapshot(capabilities),
          scheduling: {
            groupId: task.groupId,
            rationale: formation.rationale,
            dependencies: task.dependencies || [],
            writeDomains: task.writeDomains || [],
            sharedArtifacts: task.sharedArtifacts || []
            , decisionKind: formation.decisionKind
          }
        });
        createdRecord = record;
        delegationId = record.contract.identity.delegationId;
        // The durable delegation ID is authoritative; replace the planning key
        // with it before admission so dependencies can reference real records.
        task.id = record.contract.identity.delegationId;
        // Admit against the local scheduler first so capacity/dependency
        // queues are visible distinctly from cross-session claim waits.
        await waitForAdmission(task, record);
        updateDelegationState(projectRoot, record.contract.identity.delegationId, "dispatched", "Scheduler admitted delegation.", "pm");
        // Reserve every declared claim before worker creation. The in-memory
        // scheduler protects one PM session; these filesystem claims extend
        // the same conflict boundary across PM sessions and hosts.
        const claims = [...(input.allowedPaths || role.writeDomains), ...sharedArtifacts]
          .filter((path, index, all) => all.indexOf(path) === index)
          .sort();
        for (const path of claims) {
          artifactReleases.push(await waitForPmLock(projectRoot, `artifact:${path}`, session.record.sessionId, {
            onWait: () => updateDelegationState(projectRoot, record.contract.identity.delegationId, "serialized", `Waiting for cross-session artifact claim: ${path}; serialized because the declared shared claim overlaps.`, "pm")
          }));
        }
        const roleDirectory = input.roleDirectory || join(active.packageRoot, role.directory);
        const protocolPath = join(active.packageRoot, "delegation-protocol.md");
        const context = loadWorkerContext({ projectRoot, roleDirectory, protocolPath, teamPath: teamContext.teamPath, brief: readDelegation(projectRoot, record.contract.identity.delegationId) ? `${record.goal}\n\nReturn: ${record.returnRequirements.join(", ")}` : record.goal });
        let workspace: WorkspaceRecord | undefined;
        const workspaceManager = options.workspaceManager || (input.deliveryMode === "isolated-change" ? createGitWorkspaceManager(projectRoot, options.now || (() => new Date().toISOString())) : undefined);
        if (input.deliveryMode === "isolated-change") {
          if (!workspaceManager) throw new AixError("No workspace manager is available for an isolated delegation.");
          if (!options.host.integrateWorkspace) throw new AixError("Host does not support managed workspace integration; refusing isolated-change dispatch.");
          workspace = workspaceManager.create({ delegationId: record.contract.identity.delegationId, ownerSessionId: session.record.sessionId, allowedPaths: record.contract.authority.allowedPaths, deniedPaths: record.contract.authority.deniedPaths });
          activeWorkspace = workspace;
          logger.debug("Isolated workspace created", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId, workspaceId: workspace.workspaceId }, { path: workspace.path, baseRevision: workspace.baseRevision });
        }
        const request: HostWorkerRequest = { contract: record.contract, roleInstructions: [context.roleInstructions, context.roleGuidance, context.protocol].join("\n\n"), brief: context.brief, ...(workspace ? { workspacePath: workspace.path } : {}) };
        // Canonical task groups are the default worker-assignment boundary.
        // An explicit reuseKey remains available for intentional reuse across
        // otherwise unrelated delegations, but ordinary grouped work should
        // retain one worker and its context.
        const groupReuse = !input.reuseKey;
        const reuseKey = input.reuseKey || `group:${task.groupId}`;
        const reusable = reusableWorkers.get(reuseKey);
        let worker = reusable?.worker;
        activeWorker = worker;
        let reused = false;
        if (reusable && (reusable.role !== input.role || reusable.taskMode !== input.taskMode || reusable.deliveryMode !== input.deliveryMode)) {
          throw new AixError(`Reusable worker ${reuseKey} is incompatible with this delegation.`);
        }
        if (worker) {
          if (capabilities.capabilities["worker-follow-up"] === true && options.host.sendFollowUp) {
            await options.host.sendFollowUp(worker, request);
            reused = true;
          } else if (groupReuse) {
            throw new AixError(`Task group ${task.groupId} requires host worker follow-up support to retain one worker assignment.`);
          } else {
            worker = await options.host.createWorker(request);
            activeWorker = worker;
            reusableWorkers.set(reuseKey, { worker, role: input.role, taskMode: input.taskMode, deliveryMode: input.deliveryMode });
          }
        } else {
          worker = await options.host.createWorker(request);
          activeWorker = worker;
          reusableWorkers.set(reuseKey, { worker, role: input.role, taskMode: input.taskMode, deliveryMode: input.deliveryMode });
        }
        await options.host.sendBrief(worker, context.brief);
        attachHostWorker(projectRoot, record.contract.identity.delegationId, worker);
        acceptDelegation(projectRoot, record.contract.identity.delegationId);
        publishWorkerStatus(projectRoot, record.contract.identity.delegationId, "working", reused ? "Existing compatible worker received a fresh delegation." : "Worker started with a fresh delegation.");
        logger.info("Delegation dispatched", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId, subagentId: record.contract.identity.subagentId, hostWorkerId: worker.hostWorkerId }, { role: input.role, reused });
        const result = await options.host.waitForResult(worker);
        if (result.delegationId !== record.contract.identity.delegationId || result.subagentId !== record.contract.identity.subagentId || result.hostWorkerId !== worker.hostWorkerId || (worker.hostMissionId && result.hostMissionId !== worker.hostMissionId) || (worker.hostRunId && result.hostRunId !== worker.hostRunId)) {
          throw new AixError("Host returned a result with mismatched delegation identity.");
        }
        let finalRecord = publishWorkerResult(projectRoot, record.contract.identity.delegationId, { status: result.status, summary: result.result, evidence: ["Host returned a correlated result."], gaps: result.status === "completed" ? [] : ["Worker did not complete normally."], residualRisk: [] });
        if (workspace && workspaceManager && result.status === "completed") {
          if (integrationActive) {
            finalRecord = updateDelegationState(projectRoot, record.contract.identity.delegationId, "serialized", "Waiting for the parent-workspace integration lock.", "pm");
            logger.info("Delegation serialized for integration", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId }, { workspaceId: workspace.workspaceId });
          }
          const integration = integrationTail.then(async () => {
            integrationActive = true;
            const releaseIntegration = await waitForPmLock(projectRoot, "parent-workspace-integration", session.record.sessionId, {
              onWait: () => updateDelegationState(projectRoot, record.contract.identity.delegationId, "serialized", "Waiting for cross-session parent-workspace integration admission.", "pm")
            });
            try {
              workspace = await workspaceManager!.integrate(workspace!, (request) => options.host.integrateWorkspace!(request));
              workspaceManager!.cleanup(workspace!);
              logger.info("PM integrated and cleaned isolated workspace", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId, workspaceId: workspace!.workspaceId });
            } finally {
              releaseIntegration();
              integrationActive = false;
            }
          });
          integrationTail = integration.catch(() => undefined);
          try {
            await integration;
            finalRecord = updateDelegationState(projectRoot, record.contract.identity.delegationId, "completed", "Worker result integrated into the parent workspace.", "pm");
            appendEvent(projectRoot, finalRecord, "integrated", "pm", { workspaceId: workspace.workspaceId });
          } catch (error) {
            finalRecord = updateDelegationState(projectRoot, record.contract.identity.delegationId, "blocked", "Integration conflict retained for PM recovery.", "pm");
            appendEvent(projectRoot, finalRecord, "conflict-recovery", "pm", { workspaceId: workspace.workspaceId });
            throw error;
          }
        }
        logger.info("Delegation result received", { sessionId: session.record.sessionId, delegationId: record.contract.identity.delegationId, hostWorkerId: worker.hostWorkerId }, { status: result.status });
        return { record: finalRecord, worker, reused, report: createDelegationReport(finalRecord, worker, result) };
      } catch (error) {
        if (createdRecord) {
          const state = activeWorkspace ? "blocked" : "failed";
          const message = activeWorkspace
            ? "Delegation stopped with an unresolved workspace or integration recovery condition."
            : `Delegation failed before completion: ${error instanceof Error ? error.message : String(error)}`;
          const failed = updateDelegationState(projectRoot, createdRecord.contract.identity.delegationId, state, message, "aix");
          appendEvent(projectRoot, failed, "failure-recovery", "aix", {
            state,
            ...(activeWorker ? { hostWorkerId: activeWorker.hostWorkerId } : {}),
            ...(activeWorkspace ? { workspaceId: activeWorkspace.workspaceId } : {})
          });
          logger.error("Delegation failure persisted", { sessionId: session.record.sessionId, delegationId: createdRecord.contract.identity.delegationId }, { state, ...(activeWorkspace ? { workspaceId: activeWorkspace.workspaceId } : {}) });
        }
        throw error;
      } finally {
        if (delegationId) activeTasks.delete(delegationId);
        artifactReleases.reverse().forEach((releaseArtifact) => releaseArtifact());
        release();
      }
    },
    async recover(delegationId, action) {
      const record = readDelegation(projectRoot, delegationId);
      const release = acquirePmLock(projectRoot, `delegation:${delegationId}`, session.record.sessionId);
      try {
        const worker: HostWorkerHandle | undefined = record.contract.identity.hostWorkerId ? { subagentId: record.contract.identity.subagentId, hostWorkerId: record.contract.identity.hostWorkerId, displayName: record.contract.identity.displayName } : undefined;
        if (action === "retry") {
          const superseded = updateDelegationState(projectRoot, delegationId, "superseded", "PM is creating a fresh worker and delegation.", "pm");
          appendEvent(projectRoot, superseded, "retry-required", "pm", { priorDelegationId: delegationId });
          release();
          const retried = await orchestrator.dispatch({
            role: record.contract.authority.role,
            taskMode: record.contract.authority.taskMode,
            deliveryMode: record.contract.authority.deliveryMode,
            goal: record.goal,
            constraints: record.constraints,
            acceptanceSignals: record.acceptanceSignals,
            returnRequirements: record.returnRequirements,
            allowedPaths: record.contract.authority.allowedPaths,
            deniedPaths: record.contract.authority.deniedPaths,
            requiredAccess: record.contract.authority.requiredAccess,
            stopConditions: record.contract.authority.stopConditions
          });
          return retried.record;
        }
        if (action === "follow-up") {
          if (!worker || !options.host.sendFollowUp || capabilities.capabilities["worker-follow-up"] !== true) {
            throw new AixError("The current host cannot follow up with this worker.");
          }
          await options.host.sendFollowUp(worker, { contract: record.contract, roleInstructions: "Continue the existing bounded delegation and publish an updated result.", brief: `Follow-up for ${delegationId}: review the current durable records and continue only within the original authority.` });
        }
        if ((action === "stop" || action === "pause") && worker) await options.host.stopWorker?.(worker);
        const next = action === "pause" ? "paused" : action === "stop" ? "cancelled" : action === "redirect" || action === "repair" ? "blocked" : action === "escalate" ? "needs-decision" : "working";
        const updated = updateDelegationState(projectRoot, delegationId, next, `PM recovery action: ${action}.`, "pm");
        appendEvent(projectRoot, updated, "recovery-action", "pm", { action, decision: next === "paused" ? "held" : "recovery", rationale: `PM applied ${action} to the persisted delegation state.` });
        logger.warn("PM recovery action applied", { sessionId: session.record.sessionId, delegationId }, { action, state: next });
        return updated;
      } finally {
        release();
      }
    },
    status() {
      return {
        sessionId: session.record.sessionId,
        leaseExpiresAt: session.lease.expiresAt,
        workflow: active.manifest.name,
        workflowVersion: active.lock.resolvedCommit || "1",
        capabilities: capabilities.capabilities,
        host: { provider: capabilities.provider, harness: capabilities.harness, model: capabilities.model, runtime: capabilities.runtime },
        delegations: listDelegations(projectRoot).map((record) => ({ delegationId: record.contract.identity.delegationId, subagentId: record.contract.identity.subagentId, displayName: record.contract.identity.displayName, role: record.contract.authority.role, state: record.state, updatedAt: record.updatedAt, ...(record.scheduling?.groupId ? { groupId: record.scheduling.groupId } : {}), ...(record.scheduling?.decision ? { schedulingDecision: record.scheduling.decision } : {}), ...(record.scheduling?.decisionKind ? { schedulingDecisionKind: record.scheduling.decisionKind } : {}), ...(record.scheduling?.reason ? { schedulingReason: record.scheduling.reason } : {}), ...(record.scheduling?.rationale ? { groupRationale: record.scheduling.rationale } : {}), ...(record.capabilitySnapshot ? { capabilitySnapshot: record.capabilitySnapshot } : {}) }))
      };
    },
    close() {
      session.release();
      logger.info("PM session closed", { sessionId: session.record.sessionId });
    }
  };
  await orchestrator.reconcile();
  return orchestrator;
}
