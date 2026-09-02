import { randomUUID } from "node:crypto";
import { AixError } from "../errors.js";
import type { DelegationContract } from "./types.js";

export interface HostCapabilitySnapshot {
  provider: string;
  harness: string;
  model: string;
  runtime: string;
  discoveredAt: string;
  capabilities: Record<string, boolean | "unknown">;
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
  displayName: string;
}

export interface HostWorkerResult {
  hostWorkerId: string;
  subagentId: string;
  delegationId: string;
  status: "completed" | "blocked" | "failed";
  result: string;
}

export interface HostExecution {
  discoverCapabilities(): Promise<HostCapabilitySnapshot>;
  createWorker(request: HostWorkerRequest): Promise<HostWorkerHandle>;
  sendBrief(worker: HostWorkerHandle, brief: string): Promise<void>;
  waitForResult(worker: HostWorkerHandle): Promise<HostWorkerResult>;
  sendFollowUp?(worker: HostWorkerHandle, request: HostWorkerRequest): Promise<void>;
  inspectWorker?(worker: HostWorkerHandle): Promise<{ state: string }>;
  stopWorker?(worker: HostWorkerHandle): Promise<void>;
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
}

export interface PiBridge {
  runtimeInfo(): Promise<{ provider?: string; model?: string; runtime?: string; capabilities: Record<string, boolean | "unknown"> }>;
  createSubagent(request: { name: string; prompt: string }): Promise<{ id: string }>;
  waitForSubagent(id: string): Promise<{ status: "completed" | "blocked" | "failed"; output: string }>;
  inspectSubagent?(id: string): Promise<{ state: string }>;
  stopSubagent?(id: string): Promise<void>;
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
      displayName: request.contract.identity.displayName
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
      result: result.output
    };
  }

  async inspectWorker(worker: HostWorkerHandle): Promise<{ state: string }> {
    return this.pi.inspectSubagent?.(worker.hostWorkerId) || { state: "unsupported" };
  }

  async stopWorker(worker: HostWorkerHandle): Promise<void> {
    await this.pi.stopSubagent?.(worker.hostWorkerId);
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
        "workspace-write": true
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
}
