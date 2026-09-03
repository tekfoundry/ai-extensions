import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  FakeNativeHost,
  CodexHostAdapter,
  ClaudeHostAdapter,
  PiHostAdapter,
  SessionCapabilityDiscovery,
  createPersistedCapabilitySnapshot,
  assertHostCapabilities,
  createDelegation,
  loadWorkerContext,
  publishWorkerResult,
  publishWorkerStatus,
  readDelegation
} from "../dist/pm/index.js";

test("fake native host creates independent correlated workers and fails closed", async () => {
  const host = new FakeNativeHost();
  const snapshot = await host.discoverCapabilities();
  assert.doesNotThrow(() => assertHostCapabilities(snapshot, ["native-worker-creation", "correlated-results"]));
  assert.throws(() => assertHostCapabilities(snapshot, ["unsupported-capability"]), /requires native host capabilities/);

  const base = {
    recordSchemaVersion: 1,
    protocolVersion: 1,
    workflow: "design-plan-execute",
    workflowVersion: "1",
    pmRoleVersion: "1",
    authority: { role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], requiredAccess: ["workspace-write"], stopConditions: ["scope unclear"] }
  };
  const first = await host.createWorker({ contract: { ...base, identity: { subagentId: "subagent-1", delegationId: "delegation-1", displayName: "Implementation Engineer 1" } }, roleInstructions: "role one", brief: "brief one" });
  const second = await host.createWorker({ contract: { ...base, identity: { subagentId: "subagent-2", delegationId: "delegation-2", displayName: "Implementation Engineer 2" } }, roleInstructions: "role two", brief: "brief two" });
  assert.notEqual(first.hostWorkerId, second.hostWorkerId);
  assert.equal((await host.waitForResult(first)).delegationId, "delegation-1");
  assert.equal(host.workers[0].brief, "brief one");
  assert.equal(host.workers[1].roleInstructions, "role two");
});

test("host capability checks fail closed for missing and unknown native delegation support", () => {
  for (const value of [false, "unknown"]) {
    const snapshot = {
      provider: "fixture",
      harness: "fixture",
      model: "fixture",
      runtime: "test",
      discoveredAt: "2026-09-02T00:00:00.000Z",
      capabilities: {
        "native-worker-creation": value,
        "correlated-results": value
      }
    };

    assert.throws(
      () => assertHostCapabilities(snapshot, ["native-worker-creation", "correlated-results"]),
      /native-worker-creation, correlated-results/
    );
  }
});

test("Pi adapter translates native subagent calls without changing AIX contracts", async () => {
  const calls = [];
  const adapter = new PiHostAdapter({
    async runtimeInfo() { return { provider: "anthropic", model: "claude", capabilities: { "native-worker-creation": true, "correlated-results": true } }; },
    async createSubagent(request) { calls.push(request); return { id: "pi-worker-1" }; },
    async waitForSubagent() { return { status: "completed", output: "Pi result" }; }
  });
  const contract = {
    recordSchemaVersion: 1, protocolVersion: 1, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    identity: { subagentId: "subagent-pi", delegationId: "delegation-pi", displayName: "Quality Engineer" },
    authority: { role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", allowedPaths: ["tests/"], deniedPaths: ["src/"], requiredAccess: ["read"], stopConditions: ["scope unclear"] }
  };
  const worker = await adapter.createWorker({ contract, roleInstructions: "role", brief: "brief" });
  const result = await adapter.waitForResult(worker);
  assert.equal(calls[0].name, "Quality Engineer");
  assert.match(calls[0].prompt, /role/);
  assert.equal(result.delegationId, "delegation-pi");
  assert.equal((await adapter.discoverCapabilities()).harness, "pi");
});

test("Codex adapter translates native worker calls and delivery permissions", async () => {
  const calls = [];
  const adapter = new CodexHostAdapter({
    async runtimeInfo() {
      return {
        provider: "openai",
        model: "gpt-5.5",
        runtime: "codex-cli",
        version: "codex-cli 0.148.0",
        capabilities: {
          "native-worker-creation": true,
          "correlated-results": true,
          "worker-follow-up": true,
          "worker-stop": true,
          "workspace-binding": true
        }
      };
    },
    async createSubagent(request) { calls.push(request); return { id: "codex-worker-1" }; },
    async waitForSubagent() { return { status: "completed", output: "Codex result" }; }
  });
  const contract = {
    recordSchemaVersion: 1, protocolVersion: 1, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    identity: { subagentId: "subagent-codex", delegationId: "delegation-codex", displayName: "Implementation Engineer" },
    authority: { role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], requiredAccess: ["workspace-write"], stopConditions: ["scope unclear"] }
  };
  const worker = await adapter.createWorker({ contract, roleInstructions: "role", brief: "brief", workspacePath: "/tmp/aix-worker" });
  const result = await adapter.waitForResult(worker);
  assert.equal(calls[0].name, "Implementation Engineer");
  assert.match(calls[0].prompt, /role/);
  assert.match(calls[0].prompt, /brief/);
  assert.equal(calls[0].workspacePath, "/tmp/aix-worker");
  assert.equal(calls[0].writable, true);
  assert.equal(result.delegationId, "delegation-codex");
  const snapshot = await adapter.discoverCapabilities();
  assert.equal(snapshot.harness, "codex");
  assert.equal(snapshot.provider, "openai");
  assert.equal(snapshot.model, "gpt-5.5");
});

test("Codex adapter exposes the complete supported status, control, permission, workspace, and concurrency contract", async () => {
  const calls = [];
  let stopped = false;
  const adapter = new CodexHostAdapter({
    async runtimeInfo() {
      return { provider: "openai", model: "gpt-5.5", runtime: "codex-cli", capabilities: {
        "native-worker-creation": true, "correlated-results": true, "worker-stop": true,
        "permission-control": true, "workspace-binding": true, "workspace-write": true,
        "workspace-integration": true, "concurrency-reporting": true
      } };
    },
    async createSubagent() { return { id: "codex-contract-worker" }; },
    async waitForSubagent() { return { status: "completed", output: "done" }; },
    async inspectSubagent(id) { calls.push(["inspect", id]); return { state: "working" }; },
    async stopSubagent(id) { calls.push(["stop", id]); stopped = true; },
    async resolvePermissions(request) { calls.push(["permissions", request]); return { mode: request.writable ? "workspace-write" : "read-only", workspacePath: request.workspacePath, access: [...request.requiredAccess] }; },
    async integrateWorkspace(request) { calls.push(["workspace", request.workspacePath, request.changedPaths]); },
    async reportConcurrency() { calls.push(["concurrency"]); return { active: 2, limit: 4 }; }
  });
  const contract = {
    recordSchemaVersion: 1, protocolVersion: 1, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    identity: { subagentId: "subagent-codex-contract", delegationId: "delegation-codex-contract", displayName: "Implementation Engineer" },
    authority: { role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], requiredAccess: ["workspace-write"], stopConditions: ["scope unclear"] }
  };
  const worker = await adapter.createWorker({ contract, roleInstructions: "role", brief: "brief", workspacePath: "/tmp/aix-worker" });
  assert.deepEqual(await adapter.inspectWorker(worker), { state: "working" });
  await adapter.stopWorker(worker);
  assert.equal(stopped, true);
  assert.deepEqual(await adapter.resolvePermissions({ workspacePath: "/tmp/aix-worker", writable: true, requiredAccess: ["workspace-write"] }), { mode: "workspace-write", workspacePath: "/tmp/aix-worker", access: ["workspace-write"] });
  await adapter.integrateWorkspace({ workspacePath: "/tmp/aix-worker", integrationTarget: "/tmp/project", baseRevision: "abc", changedPaths: ["src/a.ts"], patch: "" });
  assert.deepEqual(await adapter.reportConcurrency(), { active: 2, limit: 4 });
  assert.deepEqual(calls.map(([name]) => name), ["inspect", "stop", "permissions", "workspace", "concurrency"]);
});

test("Codex adapter refuses unknown optional provider operations instead of falling back", async () => {
  const adapter = new CodexHostAdapter({
    async runtimeInfo() { return { capabilities: { "native-worker-creation": true, "correlated-results": true, "permission-control": "unknown", "concurrency-reporting": "unknown" } }; },
    async createSubagent() { return { id: "codex-worker-unknown" }; },
    async waitForSubagent() { return { status: "completed", output: "done" }; }
  });
  await assert.rejects(() => adapter.resolvePermissions({ writable: false, requiredAccess: ["read"] }), /does not support task-scoped permission/);
  await assert.rejects(() => adapter.reportConcurrency(), /does not report worker concurrency/);
  const snapshot = await adapter.discoverCapabilities();
  assert.throws(() => assertHostCapabilities(snapshot, ["permission-control"]), /requires native host capabilities/);
});

test("Claude adapter translates native worker calls and delivery permissions", async () => {
  const calls = [];
  const adapter = new ClaudeHostAdapter({
    async runtimeInfo() {
      return {
        provider: "anthropic",
        model: "sonnet",
        runtime: "claude-cli",
        version: "2.1.235",
        capabilities: {
          "native-worker-creation": true,
          "correlated-results": true,
          "worker-follow-up": true,
          "worker-stop": true,
          "workspace-binding": true
        }
      };
    },
    async createSubagent(request) { calls.push(request); return { id: "claude-worker-1" }; },
    async waitForSubagent() { return { status: "completed", output: "Claude result" }; }
  });
  const contract = {
    recordSchemaVersion: 1, protocolVersion: 1, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    identity: { subagentId: "subagent-claude", delegationId: "delegation-claude", displayName: "Security Engineer" },
    authority: { role: "security-engineer", taskMode: "review", deliveryMode: "report-only", allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], requiredAccess: ["read"], stopConditions: ["scope unclear"] }
  };
  const worker = await adapter.createWorker({ contract, roleInstructions: "role", brief: "brief", workspacePath: "/tmp/aix-worker" });
  const result = await adapter.waitForResult(worker);
  assert.equal(calls[0].name, "Security Engineer");
  assert.match(calls[0].prompt, /role/);
  assert.match(calls[0].prompt, /brief/);
  assert.equal(calls[0].workspacePath, "/tmp/aix-worker");
  assert.equal(calls[0].writable, false);
  assert.equal(result.delegationId, "delegation-claude");
  const snapshot = await adapter.discoverCapabilities();
  assert.equal(snapshot.harness, "claude");
  assert.equal(snapshot.provider, "anthropic");
  assert.equal(snapshot.model, "sonnet");
});

test("capability discovery refreshes on a new session or explicit request", async () => {
  let discoveries = 0;
  const host = new FakeNativeHost({ now: () => `2026-09-01T00:00:0${++discoveries}.000Z` });
  const discovery = new SessionCapabilityDiscovery(host);
  const first = await discovery.get("session-a");
  const reused = await discovery.get("session-a");
  const next = await discovery.get("session-b");
  const forced = await discovery.get("session-b", true);
  assert.equal(first.discoveredAt, reused.discoveredAt);
  assert.notEqual(first.discoveredAt, next.discoveredAt);
  assert.notEqual(next.discoveredAt, forced.discoveredAt);
});

test("persisted capability snapshots are bounded, sorted, immutable, and secret-free", () => {
  const snapshot = createPersistedCapabilitySnapshot({
    provider: "host", harness: "native", model: "model", runtime: "runtime", discoveredAt: "2026-09-01T00:00:00.000Z",
    capabilities: { zeta: false, alpha: true }
  });
  assert.deepEqual(Object.keys(snapshot.capabilities), ["alpha", "zeta"]);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.capabilities));
  assert.throws(() => createPersistedCapabilitySnapshot({
    provider: "host", harness: "native", model: "model", runtime: "runtime", discoveredAt: "2026-09-01T00:00:00.000Z",
    capabilities: { "api-token": true }
  }), /raw secret fields/);
});

test("delegation writes a bounded brief and recoverable worker exchange", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-runtime-"));
  const record = createDelegation({
    projectRoot,
    workflow: "design-plan-execute",
    workflowVersion: "1",
    pmRoleVersion: "1",
    role: "quality-engineer",
    displayName: "Quality Engineer",
    taskMode: "verification",
    deliveryMode: "report-only",
    goal: "Review the targeted tests.",
    constraints: ["Do not edit source code."],
    acceptanceSignals: ["Return commands and results."],
    allowedPaths: ["tests/"],
    deniedPaths: ["src/", ".aix/pm/"],
    requiredAccess: ["read"],
    stopConditions: ["Missing test context."],
    returnRequirements: ["Summary", "Evidence", "Gaps"]
  });
  const root = join(projectRoot, ".aix/pm/delegations", record.contract.identity.delegationId);
  assert.ok(existsSync(join(root, "brief.md")));
  assert.match(readFileSync(join(root, "brief.md"), "utf8"), /delegation_id/);
  publishWorkerStatus(projectRoot, record.contract.identity.delegationId, "working", "Inspecting tests.");
  publishWorkerResult(projectRoot, record.contract.identity.delegationId, { status: "completed", summary: "Tests pass.", evidence: ["npm test"], gaps: [], residualRisk: [] });
  assert.equal(readDelegation(projectRoot, record.contract.identity.delegationId).state, "completed");
  assert.ok(existsSync(join(root, "result.md")));
});
