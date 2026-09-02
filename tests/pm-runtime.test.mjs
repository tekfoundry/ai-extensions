import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  FakeNativeHost,
  PiHostAdapter,
  SessionCapabilityDiscovery,
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
