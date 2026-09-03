import { randomUUID } from "node:crypto";
import { execFileSync, spawn, type ChildProcessByStdio, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Readable } from "node:stream";
import { AixError } from "../errors.js";
import { assertNoRawSecrets } from "./validation.js";
import type { DelegationContract } from "./types.js";

export interface HostCapabilitySnapshot {
  provider: string;
  harness: string;
  model: string;
  runtime: string;
  discoveredAt: string;
  capabilities: Record<string, boolean | "unknown">;
}

/** Capability required before PM may authorize host-managed local integration. */
export const MANAGED_LOCAL_INTEGRATION_CAPABILITY = "managed-local-integration" as const;

export type PersistedCapabilitySnapshot = Readonly<HostCapabilitySnapshot>;

const MAX_SNAPSHOT_STRING_LENGTH = 128;
const MAX_SNAPSHOT_CAPABILITIES = 64;

/** Create the bounded, host-neutral snapshot stored with a delegation record. */
export function createPersistedCapabilitySnapshot(snapshot: HostCapabilitySnapshot): PersistedCapabilitySnapshot {
  return normalizePersistedCapabilitySnapshot(snapshot);
}

/** Validate an untrusted snapshot loaded from PM runtime storage. */
export function validatePersistedCapabilitySnapshot(value: unknown): PersistedCapabilitySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AixError("Persisted capability snapshot must be an object.");
  }
  const snapshot = value as Record<string, unknown>;
  const fields = ["provider", "harness", "model", "runtime", "discoveredAt", "capabilities"];
  if (Object.keys(snapshot).some((field) => !fields.includes(field)) || fields.some((field) => !(field in snapshot))) {
    throw new AixError("Persisted capability snapshot has an invalid shape.");
  }
  if (!snapshot.capabilities || typeof snapshot.capabilities !== "object" || Array.isArray(snapshot.capabilities)) {
    throw new AixError("Persisted capability snapshot capabilities must be an object.");
  }
  return normalizePersistedCapabilitySnapshot(snapshot as unknown as HostCapabilitySnapshot);
}

function normalizePersistedCapabilitySnapshot(snapshot: HostCapabilitySnapshot): PersistedCapabilitySnapshot {
  assertNoRawSecrets(snapshot, "capabilitySnapshot");
  const metadata = ["provider", "harness", "model", "runtime", "discoveredAt"] as const;
  for (const field of metadata) {
    if (typeof snapshot[field] !== "string" || snapshot[field].length > MAX_SNAPSHOT_STRING_LENGTH) {
      throw new AixError(`Capability snapshot ${field} must be a string of at most ${MAX_SNAPSHOT_STRING_LENGTH} characters.`);
    }
  }
  const entries = Object.entries(snapshot.capabilities);
  if (entries.length > MAX_SNAPSHOT_CAPABILITIES) {
    throw new AixError(`Capability snapshot cannot contain more than ${MAX_SNAPSHOT_CAPABILITIES} capabilities.`);
  }
  const capabilities = Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
  for (const [name, value] of Object.entries(capabilities)) {
    if (name.length === 0 || name.length > MAX_SNAPSHOT_STRING_LENGTH || ![true, false, "unknown"].includes(value)) {
      throw new AixError("Capability snapshot contains an invalid capability entry.");
    }
  }
  return Object.freeze({
    provider: snapshot.provider,
    harness: snapshot.harness,
    model: snapshot.model,
    runtime: snapshot.runtime,
    discoveredAt: snapshot.discoveredAt,
    capabilities: Object.freeze(capabilities)
  });
}

export interface HostWorkerRequest {
  contract: DelegationContract;
  roleInstructions: string;
  brief: string;
  workspacePath?: string;
}

export interface HostWorkerHandle {
  subagentId: string;
  hostWorkerId: string;
  hostMissionId?: string;
  hostRunId?: string;
  displayName: string;
  /** Host-assigned name, when the host exposes one separately from AIX's name. */
  hostDisplayName?: string;
}

export interface HostWorkerResult {
  hostWorkerId: string;
  subagentId: string;
  delegationId: string;
  hostMissionId?: string;
  hostRunId?: string;
  status: "completed" | "blocked" | "failed";
  result: string;
}

/** Bounded, already-validated workspace data passed to a native integrator. */
export interface HostWorkspaceIntegrationRequest {
  workspacePath: string;
  integrationTarget: string;
  baseRevision: string;
  changedPaths: string[];
  patch: string;
  /** A test/in-process host may apply the PM-prepared patch through AIX. */
  applyPatch?: () => void;
}

export interface HostPermissionRequest {
  workspacePath?: string;
  writable: boolean;
  requiredAccess: readonly string[];
}

export interface HostPermissionGrant {
  mode: "read-only" | "workspace-write";
  workspacePath?: string;
  access: string[];
}

export interface HostConcurrencyReport {
  active: number;
  limit?: number;
}

export interface HostExecution {
  discoverCapabilities(): Promise<HostCapabilitySnapshot>;
  createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle>;
  sendBrief(worker: HostWorkerHandle, brief: string): Promise<void>;
  waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult>;
  sendFollowUp?(worker: HostWorkerHandle, request: HostWorkerRequest): Promise<void>;
  inspectWorker?(worker: HostWorkerHandle): Promise<{ state: string }>;
  stopWorker?(worker: HostWorkerHandle): Promise<void>;
  resolvePermissions?(request: HostPermissionRequest): Promise<HostPermissionGrant>;
  integrateWorkspace?(request: HostWorkspaceIntegrationRequest): Promise<void>;
  reportConcurrency?(): Promise<HostConcurrencyReport>;
}

/** Adapter boundary for a real native host. AIX never sees vendor objects. */
export class NativeHostAdapter implements HostExecution {
  constructor(private readonly implementation: HostExecution) {}

  discoverCapabilities(): Promise<HostCapabilitySnapshot> { return this.implementation.discoverCapabilities(); }
  createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle> { return this.implementation.createWorker(request); }
  sendBrief(worker: HostWorkerHandle, brief: string): Promise<void> { return this.implementation.sendBrief(worker, brief); }
  waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult> { return this.implementation.waitForResult(worker); }
  sendFollowUp(worker: HostWorkerHandle, request: HostWorkerRequest): Promise<void> {
    if (!this.implementation.sendFollowUp) return Promise.reject(new AixError("Host does not support worker follow-up delegation."));
    return this.implementation.sendFollowUp(worker, request);
  }
  inspectWorker(worker: HostWorkerHandle): Promise<{ state: string }> {
    return this.implementation.inspectWorker?.(worker) || Promise.resolve({ state: "unsupported" });
  }
  stopWorker(worker: HostWorkerHandle): Promise<void> {
    return this.implementation.stopWorker?.(worker) || Promise.resolve();
  }
  resolvePermissions(request: HostPermissionRequest): Promise<HostPermissionGrant> {
    if (!this.implementation.resolvePermissions) return Promise.reject(new AixError("Host does not support task-scoped permission inspection."));
    return this.implementation.resolvePermissions(request);
  }
  integrateWorkspace(request: HostWorkspaceIntegrationRequest): Promise<void> {
    if (!this.implementation.integrateWorkspace) return Promise.reject(new AixError("Host does not support managed workspace integration."));
    return this.implementation.integrateWorkspace(request);
  }
}

export interface PiBridge {
  runtimeInfo(): Promise<{ provider?: string; model?: string; runtime?: string; capabilities: Record<string, boolean | "unknown"> }>;
  createSubagent(request: { name: string; prompt: string }): Promise<{ id: string; displayName?: string; missionId?: string; runId?: string }>;
  waitForSubagent(id: string): Promise<{ status: "completed" | "blocked" | "failed"; output: string }>;
  inspectSubagent?(id: string): Promise<{ state: string }>;
  stopSubagent?(id: string): Promise<void>;
  integrateWorkspace?(request: HostWorkspaceIntegrationRequest): Promise<void>;
}

/**
 * Pi-specific translation lives here, while the Pi package remains optional.
 * The bridge is normally implemented by a Pi extension or host integration.
 */
export class PiHostAdapter implements HostExecution {
  private readonly delegations = new Map<string, string>();

  constructor(private readonly pi: PiBridge, private readonly now: () => string = () => new Date().toISOString()) {}

  async discoverCapabilities(): Promise<HostCapabilitySnapshot> {
    const info = await this.pi.runtimeInfo();
    return {
      provider: info.provider || "unknown",
      harness: "pi",
      model: info.model || "unknown",
      runtime: info.runtime || "unknown",
      discoveredAt: this.now(),
      capabilities: info.capabilities
    };
  }

  async createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle> {
    const result = await this.pi.createSubagent({
      name: request.contract.identity.displayName,
      prompt: [request.roleInstructions, request.brief].filter(Boolean).join("\n\n")
    });
    this.delegations.set(result.id, request.contract.identity.delegationId);
    return {
      subagentId: request.contract.identity.subagentId,
      hostWorkerId: result.id,
      displayName: request.contract.identity.displayName,
      ...(result.missionId ? { hostMissionId: result.missionId } : {}),
      ...(result.runId ? { hostRunId: result.runId } : {}),
      ...(result.displayName ? { hostDisplayName: result.displayName } : {})
    };
  }

  async sendBrief(_worker: HostWorkerHandle, _brief: string): Promise<void> {
    // Pi receives the full bounded prompt during createSubagent.
  }

  async waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult> {
    const result = await this.pi.waitForSubagent(worker.hostWorkerId);
    return {
      hostWorkerId: worker.hostWorkerId,
      subagentId: worker.subagentId,
      delegationId: this.delegations.get(worker.hostWorkerId) || "unknown",
      status: result.status,
      result: result.output,
      ...(worker.hostMissionId ? { hostMissionId: worker.hostMissionId } : {}),
      ...(worker.hostRunId ? { hostRunId: worker.hostRunId } : {})
    };
  }

  async inspectWorker(worker: HostWorkerHandle): Promise<{ state: string }> {
    return this.pi.inspectSubagent?.(worker.hostWorkerId) || { state: "unsupported" };
  }

  async stopWorker(worker: HostWorkerHandle): Promise<void> {
    await this.pi.stopSubagent?.(worker.hostWorkerId);
  }

  async integrateWorkspace(request: HostWorkspaceIntegrationRequest): Promise<void> {
    if (!this.pi.integrateWorkspace) throw new AixError("Pi host does not support managed workspace integration.");
    await this.pi.integrateWorkspace(request);
  }
}

export interface CodexBridge {
  runtimeInfo(): Promise<{ provider?: string; model?: string; runtime?: string; version?: string; capabilities: Record<string, boolean | "unknown"> }>;
  createSubagent(request: { name: string; prompt: string; workspacePath?: string; writable: boolean }): Promise<{ id: string; displayName?: string; missionId?: string; runId?: string }>;
  waitForSubagent(id: string): Promise<{ status: "completed" | "blocked" | "failed"; output: string }>;
  sendFollowUp?(id: string, request: { prompt: string; workspacePath?: string }): Promise<void>;
  inspectSubagent?(id: string): Promise<{ state: string }>;
  stopSubagent?(id: string): Promise<void>;
  resolvePermissions?(request: HostPermissionRequest): Promise<HostPermissionGrant>;
  reportConcurrency?(): Promise<HostConcurrencyReport>;
  integrateWorkspace?(request: HostWorkspaceIntegrationRequest): Promise<void>;
}

/**
 * Codex-specific translation lives behind this bridge. The PM sees only the
 * host-neutral worker contract and never receives Codex session objects.
 */
export class CodexHostAdapter implements HostExecution {
  private readonly delegations = new Map<string, string>();

  constructor(private readonly codex: CodexBridge, private readonly now: () => string = () => new Date().toISOString()) {}

  async discoverCapabilities(): Promise<HostCapabilitySnapshot> {
    const info = await this.codex.runtimeInfo();
    return {
      provider: info.provider || "openai",
      harness: "codex",
      model: info.model || "unknown",
      runtime: info.runtime || "codex-cli",
      discoveredAt: this.now(),
      capabilities: info.capabilities
    };
  }

  async createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle> {
    const result = await this.codex.createSubagent({
      name: request.contract.identity.displayName,
      prompt: [request.roleInstructions, request.brief].filter(Boolean).join("\n\n"),
      workspacePath: request.workspacePath,
      writable: request.contract.authority.deliveryMode !== "report-only"
    });
    this.delegations.set(result.id, request.contract.identity.delegationId);
    return {
      subagentId: request.contract.identity.subagentId,
      hostWorkerId: result.id,
      displayName: request.contract.identity.displayName,
      ...(result.missionId ? { hostMissionId: result.missionId } : {}),
      ...(result.runId ? { hostRunId: result.runId } : {}),
      ...(result.displayName ? { hostDisplayName: result.displayName } : {})
    };
  }

  async sendBrief(_worker: HostWorkerHandle, _brief: string): Promise<void> {
    // Codex receives the bounded role context and brief during process creation.
  }

  async waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult> {
    const result = await this.codex.waitForSubagent(worker.hostWorkerId);
    return {
      hostWorkerId: worker.hostWorkerId,
      subagentId: worker.subagentId,
      delegationId: this.delegations.get(worker.hostWorkerId) || "unknown",
      status: result.status,
      result: result.output,
      ...(worker.hostMissionId ? { hostMissionId: worker.hostMissionId } : {}),
      ...(worker.hostRunId ? { hostRunId: worker.hostRunId } : {})
    };
  }

  async sendFollowUp(worker: HostWorkerHandle, request: HostWorkerRequest): Promise<void> {
    if (!this.codex.sendFollowUp) throw new AixError("Codex host does not support worker follow-up delegation.");
    await this.codex.sendFollowUp(worker.hostWorkerId, {
      prompt: [request.roleInstructions, request.brief].filter(Boolean).join("\n\n"),
      workspacePath: request.workspacePath
    });
    this.delegations.set(worker.hostWorkerId, request.contract.identity.delegationId);
    worker.subagentId = request.contract.identity.subagentId;
  }

  async inspectWorker(worker: HostWorkerHandle): Promise<{ state: string }> {
    return this.codex.inspectSubagent?.(worker.hostWorkerId) || { state: "unsupported" };
  }

  async stopWorker(worker: HostWorkerHandle): Promise<void> {
    await this.codex.stopSubagent?.(worker.hostWorkerId);
  }

  async resolvePermissions(request: HostPermissionRequest): Promise<HostPermissionGrant> {
    if (!this.codex.resolvePermissions) throw new AixError("Codex host does not support task-scoped permission inspection.");
    return this.codex.resolvePermissions(request);
  }

  async integrateWorkspace(request: HostWorkspaceIntegrationRequest): Promise<void> {
    if (!this.codex.integrateWorkspace) throw new AixError("Codex host does not support managed workspace integration.");
    await this.codex.integrateWorkspace(request);
  }

  async reportConcurrency(): Promise<HostConcurrencyReport> {
    if (!this.codex.reportConcurrency) throw new AixError("Codex host does not report worker concurrency.");
    return this.codex.reportConcurrency();
  }
}

interface CodexCliRun {
  id: string;
  cwd: string;
  child: ChildProcessWithoutNullStreams;
  outputPath: string;
  sessionId?: string;
  state: "working" | "completed" | "failed" | "stopped";
  result: Promise<{ status: "completed" | "blocked" | "failed"; output: string }>;
}

/** Process bridge for the installed Codex CLI. Prompts are sent over stdin. */
export class CodexCliBridge implements CodexBridge {
  private readonly runs = new Map<string, CodexCliRun>();

  constructor(private readonly options: {
    command?: string;
    model?: string;
    persistSessions?: boolean;
    now?: () => string;
  } = {}) {}

  async runtimeInfo(): Promise<{ provider?: string; model?: string; runtime?: string; version?: string; capabilities: Record<string, boolean | "unknown"> }> {
    const command = this.options.command || "codex";
    let version: string;
    try {
      version = execFileSync(command, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AixError(`Codex host is unavailable: ${command} --version failed (${message})`);
    }
    return {
      provider: "openai",
      model: this.options.model || "unknown",
      runtime: "codex-cli",
      version,
      capabilities: {
        "native-worker-creation": true,
        "correlated-results": true,
        "worker-streaming": true,
        "worker-follow-up": this.options.persistSessions !== false,
        "worker-stop": true,
        "permission-control": true,
        "workspace-binding": true,
        "workspace-write": true,
        "workspace-integration": true,
        "concurrency-reporting": true
      }
    };
  }

  async createSubagent(request: { name: string; prompt: string; workspacePath?: string; writable: boolean }): Promise<{ id: string; displayName?: string; missionId?: string; runId?: string }> {
    const id = `codex-worker-${randomUUID()}`;
    const args = ["exec", "--json", "--color", "never", "--sandbox", request.writable ? "workspace-write" : "read-only", "--ask-for-approval", "never"];
    if (this.options.persistSessions === false) args.push("--ephemeral");
    if (this.options.model) args.push("--model", this.options.model);
    args.push("-o", this.outputPath(id), "-");
    this.startRun(id, args, request.prompt, request.workspacePath || process.cwd());
    return { id };
  }

  async waitForSubagent(id: string): Promise<{ status: "completed" | "blocked" | "failed"; output: string }> {
    const run = this.runs.get(id);
    if (!run) throw new AixError(`Unknown Codex worker: ${id}`);
    return run.result;
  }

  async sendFollowUp(id: string, request: { prompt: string; workspacePath?: string }): Promise<void> {
    const previous = this.runs.get(id);
    if (!previous?.sessionId || this.options.persistSessions === false) {
      throw new AixError("Codex worker follow-up requires a persisted Codex session.");
    }
    const args = ["exec", "resume", previous.sessionId, "--json", "--color", "never"];
    if (this.options.model) args.push("--model", this.options.model);
    args.push("-o", this.outputPath(id), "-");
    this.startRun(id, args, request.prompt, request.workspacePath || previous.cwd);
  }

  async inspectSubagent(id: string): Promise<{ state: string }> {
    return { state: this.runs.get(id)?.state || "unknown" };
  }

  async stopSubagent(id: string): Promise<void> {
    const run = this.runs.get(id);
    if (run && run.state === "working") {
      run.state = "stopped";
      run.child.kill("SIGTERM");
    }
  }

  async resolvePermissions(request: HostPermissionRequest): Promise<HostPermissionGrant> {
    const mode = request.writable ? "workspace-write" : "read-only";
    if (request.writable && !request.workspacePath) {
      throw new AixError("Codex workspace-write permission requires an isolated workspace path.");
    }
    return { mode, ...(request.workspacePath ? { workspacePath: request.workspacePath } : {}), access: [...request.requiredAccess] };
  }

  async reportConcurrency(): Promise<HostConcurrencyReport> {
    const active = [...this.runs.values()].filter((run) => run.state === "working").length;
    return { active };
  }

  async integrateWorkspace(request: HostWorkspaceIntegrationRequest): Promise<void> {
    if (!request.applyPatch) throw new AixError("Codex managed workspace integration requires an AIX-validated integration operation.");
    request.applyPatch();
  }

  private outputPath(id: string): string {
    const directory = join(tmpdir(), "aix-codex-workers");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    return join(directory, `${id}.output.md`);
  }

  private startRun(id: string, args: string[], prompt: string, cwd: string): void {
    const outputPath = this.outputPath(id);
    const child = spawn(this.options.command || "codex", args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let sessionId: string | undefined;
    const result = new Promise<{ status: "completed" | "blocked" | "failed"; output: string }>((resolve) => {
      child.stdout.on("data", (chunk: Buffer | string) => {
        const text = chunk.toString();
        stdout += text;
        stdoutBuffer += text;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as { type?: string; thread_id?: string; thread?: { id?: string } };
            if (event.type === "thread.started") sessionId = event.thread_id || event.thread?.id;
          } catch {
            // Incomplete JSONL lines are parsed again on the next chunk.
          }
        }
      });
      child.stderr.on("data", (chunk: Buffer | string) => { stderr += chunk.toString(); });
      child.once("error", (error) => {
        const run = this.runs.get(id);
        if (run) run.state = "failed";
        resolve({ status: "failed", output: stderr || String(error) });
      });
      child.once("close", (code) => {
        const run = this.runs.get(id);
        if (run) {
          run.sessionId = sessionId;
          run.state = code === 0 ? "completed" : (run.state === "stopped" ? "stopped" : "failed");
        }
        const output = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : (stderr || stdout);
        resolve({ status: code === 0 ? "completed" : "failed", output });
        try { rmSync(outputPath, { force: true }); } catch { /* best-effort temp cleanup */ }
      });
    });
    const run: CodexCliRun = { id, cwd, child, outputPath, state: "working", result };
    this.runs.set(id, run);
    child.stdin.end(prompt);
  }
}

export interface ClaudeBridge {
  runtimeInfo(): Promise<{ provider?: string; model?: string; runtime?: string; version?: string; capabilities: Record<string, boolean | "unknown"> }>;
  createSubagent(request: { name: string; prompt: string; workspacePath?: string; writable: boolean }): Promise<{ id: string; displayName?: string; missionId?: string; runId?: string }>;
  waitForSubagent(id: string): Promise<{ status: "completed" | "blocked" | "failed"; output: string }>;
  sendFollowUp?(id: string, request: { prompt: string; workspacePath?: string }): Promise<void>;
  inspectSubagent?(id: string): Promise<{ state: string }>;
  stopSubagent?(id: string): Promise<void>;
  integrateWorkspace?(request: HostWorkspaceIntegrationRequest): Promise<void>;
}

/**
 * Claude-specific translation lives behind this bridge. The PM sees only the
 * host-neutral worker contract and never receives Claude session objects.
 */
export class ClaudeHostAdapter implements HostExecution {
  private readonly delegations = new Map<string, string>();

  constructor(private readonly claude: ClaudeBridge, private readonly now: () => string = () => new Date().toISOString()) {}

  async discoverCapabilities(): Promise<HostCapabilitySnapshot> {
    const info = await this.claude.runtimeInfo();
    return {
      provider: info.provider || "anthropic",
      harness: "claude",
      model: info.model || "unknown",
      runtime: info.runtime || "claude-cli",
      discoveredAt: this.now(),
      capabilities: info.capabilities
    };
  }

  async createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle> {
    const result = await this.claude.createSubagent({
      name: request.contract.identity.displayName,
      prompt: [request.roleInstructions, request.brief].filter(Boolean).join("\n\n"),
      workspacePath: request.workspacePath,
      writable: request.contract.authority.deliveryMode !== "report-only"
    });
    this.delegations.set(result.id, request.contract.identity.delegationId);
    return {
      subagentId: request.contract.identity.subagentId,
      hostWorkerId: result.id,
      displayName: request.contract.identity.displayName,
      ...(result.missionId ? { hostMissionId: result.missionId } : {}),
      ...(result.runId ? { hostRunId: result.runId } : {}),
      ...(result.displayName ? { hostDisplayName: result.displayName } : {})
    };
  }

  async sendBrief(_worker: HostWorkerHandle, _brief: string): Promise<void> {
    // Claude receives the bounded role context and brief during process creation.
  }

  async waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult> {
    const result = await this.claude.waitForSubagent(worker.hostWorkerId);
    return {
      hostWorkerId: worker.hostWorkerId,
      subagentId: worker.subagentId,
      delegationId: this.delegations.get(worker.hostWorkerId) || "unknown",
      status: result.status,
      result: result.output,
      ...(worker.hostMissionId ? { hostMissionId: worker.hostMissionId } : {}),
      ...(worker.hostRunId ? { hostRunId: worker.hostRunId } : {})
    };
  }

  async sendFollowUp(worker: HostWorkerHandle, request: HostWorkerRequest): Promise<void> {
    if (!this.claude.sendFollowUp) throw new AixError("Claude host does not support worker follow-up delegation.");
    await this.claude.sendFollowUp(worker.hostWorkerId, {
      prompt: [request.roleInstructions, request.brief].filter(Boolean).join("\n\n"),
      workspacePath: request.workspacePath
    });
    this.delegations.set(worker.hostWorkerId, request.contract.identity.delegationId);
    worker.subagentId = request.contract.identity.subagentId;
  }

  async inspectWorker(worker: HostWorkerHandle): Promise<{ state: string }> {
    return this.claude.inspectSubagent?.(worker.hostWorkerId) || { state: "unsupported" };
  }

  async stopWorker(worker: HostWorkerHandle): Promise<void> {
    await this.claude.stopSubagent?.(worker.hostWorkerId);
  }

  async integrateWorkspace(request: HostWorkspaceIntegrationRequest): Promise<void> {
    if (!this.claude.integrateWorkspace) throw new AixError("Claude host does not support managed workspace integration.");
    await this.claude.integrateWorkspace(request);
  }
}

interface ClaudeCliRun {
  id: string;
  cwd: string;
  child: ChildProcessByStdio<null, Readable, Readable>;
  sessionId?: string;
  state: "working" | "completed" | "failed" | "stopped";
  result: Promise<{ status: "completed" | "blocked" | "failed"; output: string }>;
}

/** Process bridge for the installed Claude Code CLI. */
export class ClaudeCliBridge implements ClaudeBridge {
  private readonly runs = new Map<string, ClaudeCliRun>();

  constructor(private readonly options: {
    command?: string;
    model?: string;
    persistSessions?: boolean;
  } = {}) {}

  async runtimeInfo(): Promise<{ provider?: string; model?: string; runtime?: string; version?: string; capabilities: Record<string, boolean | "unknown"> }> {
    const command = this.options.command || "claude";
    let version: string;
    try {
      version = execFileSync(command, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AixError(`Claude host is unavailable: ${command} --version failed (${message})`);
    }
    return {
      provider: "anthropic",
      model: this.options.model || "unknown",
      runtime: "claude-cli",
      version,
      capabilities: {
        "native-worker-creation": true,
        "correlated-results": true,
        "worker-streaming": true,
        "worker-follow-up": this.options.persistSessions !== false,
        "worker-stop": true,
        "workspace-binding": true,
        "workspace-write": true
      }
    };
  }

  async createSubagent(request: { name: string; prompt: string; workspacePath?: string; writable: boolean }): Promise<{ id: string; displayName?: string; missionId?: string; runId?: string }> {
    const id = `claude-worker-${randomUUID()}`;
    const args = ["--print", "--output-format", "stream-json", "--verbose", "--permission-mode", request.writable ? "acceptEdits" : "plan", "--name", request.name];
    if (this.options.persistSessions === false) args.push("--no-session-persistence");
    if (this.options.model) args.push("--model", this.options.model);
    args.push(request.prompt);
    this.startRun(id, args, request.workspacePath || process.cwd());
    return { id };
  }

  async waitForSubagent(id: string): Promise<{ status: "completed" | "blocked" | "failed"; output: string }> {
    const run = this.runs.get(id);
    if (!run) throw new AixError(`Unknown Claude worker: ${id}`);
    return run.result;
  }

  async sendFollowUp(id: string, request: { prompt: string; workspacePath?: string }): Promise<void> {
    const previous = this.runs.get(id);
    if (!previous?.sessionId || this.options.persistSessions === false) {
      throw new AixError("Claude worker follow-up requires a persisted Claude session.");
    }
    const args = ["--print", "--output-format", "stream-json", "--verbose", "--resume", previous.sessionId];
    if (this.options.model) args.push("--model", this.options.model);
    args.push(request.prompt);
    this.startRun(id, args, request.workspacePath || previous.cwd);
  }

  async inspectSubagent(id: string): Promise<{ state: string }> {
    return { state: this.runs.get(id)?.state || "unknown" };
  }

  async stopSubagent(id: string): Promise<void> {
    const run = this.runs.get(id);
    if (run && run.state === "working") {
      run.state = "stopped";
      run.child.kill("SIGTERM");
    }
  }

  private startRun(id: string, args: string[], cwd: string): void {
    const child = spawn(this.options.command || "claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let finalOutput = "";
    let sessionId: string | undefined;
    const result = new Promise<{ status: "completed" | "blocked" | "failed"; output: string }>((resolve) => {
      child.stdout.on("data", (chunk: Buffer | string) => {
        const text = chunk.toString();
        stdout += text;
        stdoutBuffer += text;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as { type?: string; session_id?: string; result?: string; is_error?: boolean };
            sessionId = sessionId || event.session_id;
            if (event.type === "result" && typeof event.result === "string") finalOutput = event.result;
          } catch {
            // Ignore non-JSON diagnostics; the final result is still captured below.
          }
        }
      });
      child.stderr.on("data", (chunk: Buffer | string) => { stderr += chunk.toString(); });
      child.once("error", (error) => {
        const run = this.runs.get(id);
        if (run) run.state = "failed";
        resolve({ status: "failed", output: stderr || String(error) });
      });
      child.once("close", (code) => {
        const run = this.runs.get(id);
        if (run) {
          run.sessionId = sessionId;
          run.state = code === 0 ? "completed" : (run.state === "stopped" ? "stopped" : "failed");
        }
        resolve({ status: code === 0 ? "completed" : "failed", output: finalOutput || stderr || stdout });
      });
    });
    const run: ClaudeCliRun = { id, cwd, child, state: "working", result };
    this.runs.set(id, run);
  }
}

export class SessionCapabilityDiscovery {
  private snapshot?: HostCapabilitySnapshot;
  private sessionKey?: string;

  constructor(private readonly host: HostExecution) {}

  async get(sessionKey: string, refresh = false): Promise<HostCapabilitySnapshot> {
    if (!refresh && this.snapshot && this.sessionKey === sessionKey) return this.snapshot;
    this.snapshot = await this.host.discoverCapabilities();
    this.sessionKey = sessionKey;
    return this.snapshot;
  }
}

export function assertHostCapabilities(
  snapshot: HostCapabilitySnapshot,
  required: readonly string[]
): void {
  const missing = required.filter((capability) => snapshot.capabilities[capability] !== true);

  if (missing.length > 0) {
    throw new AixError(
      `PM orchestration requires native host capabilities: ${missing.join(", ")}. ` +
      "The current host does not explicitly provide them."
    );
  }
}

export class FakeNativeHost implements HostExecution {
  readonly workers: HostWorkerRequest[] = [];
  readonly followUps: HostWorkerRequest[] = [];
  private readonly handles = new Map<string, HostWorkerHandle>();
  private readonly results = new Map<string, HostWorkerResult>();
  private readonly now: () => string;

  constructor(
    private readonly options: {
      provider?: string;
      harness?: string;
      model?: string;
      runtime?: string;
      workerResult?: (request: HostWorkerRequest) => string;
      workerAction?: (request: HostWorkerRequest) => void | Promise<void>;
      now?: () => string;
      capabilities?: Record<string, boolean | "unknown">;
      integrationAction?: (request: HostWorkspaceIntegrationRequest) => void | Promise<void>;
    } = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
  }

  async discoverCapabilities(): Promise<HostCapabilitySnapshot> {
    return {
      provider: this.options.provider || "fake",
      harness: this.options.harness || "fake-native",
      model: this.options.model || "fake-model",
      runtime: this.options.runtime || "test",
      discoveredAt: this.now(),
      capabilities: {
        "native-worker-creation": true,
        "correlated-results": true,
        "worker-streaming": true,
        "worker-follow-up": true,
        "worker-stop": true,
        "workspace-binding": true,
        "workspace-write": true,
        [MANAGED_LOCAL_INTEGRATION_CAPABILITY]: true,
        ...this.options.capabilities
      }
    };
  }

  async createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle> {
    const handle = {
      subagentId: request.contract.identity.subagentId,
      hostWorkerId: `fake-worker-${randomUUID()}`,
      displayName: request.contract.identity.displayName
    };

    this.workers.push(request);
    await this.options.workerAction?.(request);
    this.handles.set(handle.hostWorkerId, handle);
    this.results.set(handle.hostWorkerId, {
      hostWorkerId: handle.hostWorkerId,
      subagentId: handle.subagentId,
      delegationId: request.contract.identity.delegationId,
      status: "completed",
      result: this.options.workerResult?.(request) || "Fake worker completed with correlated evidence."
    });
    return handle;
  }

  async sendBrief(worker: HostWorkerHandle, _brief: string): Promise<void> {
    if (!this.handles.has(worker.hostWorkerId)) {
      throw new AixError(`Unknown host worker: ${worker.hostWorkerId}`);
    }
  }

  async sendFollowUp(worker: HostWorkerHandle, request: HostWorkerRequest): Promise<void> {
    if (!this.handles.has(worker.hostWorkerId)) throw new AixError(`Unknown host worker: ${worker.hostWorkerId}`);
    worker.subagentId = request.contract.identity.subagentId;
    this.followUps.push(request);
    this.results.set(worker.hostWorkerId, {
      hostWorkerId: worker.hostWorkerId,
      subagentId: request.contract.identity.subagentId,
      delegationId: request.contract.identity.delegationId,
      status: "completed",
      result: this.options.workerResult?.(request) || "Fake worker completed a follow-up with correlated evidence."
    });
  }

  async waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult> {
    const result = this.results.get(worker.hostWorkerId);

    if (!result) {
      throw new AixError(`Unknown host worker: ${worker.hostWorkerId}`);
    }

    return result;
  }

  async inspectWorker(worker: HostWorkerHandle): Promise<{ state: string }> {
    return { state: this.handles.has(worker.hostWorkerId) ? "completed" : "unknown" };
  }

  async stopWorker(worker: HostWorkerHandle): Promise<void> {
    this.handles.delete(worker.hostWorkerId);
  }

  async integrateWorkspace(request: HostWorkspaceIntegrationRequest): Promise<void> {
    if (this.options.integrationAction) {
      await this.options.integrationAction(request);
      return;
    }
    request.applyPatch?.();
  }
}
