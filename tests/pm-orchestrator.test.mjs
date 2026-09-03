import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  FakeNativeHost,
  assertPmArtifactWriteForbidden,
  createDelegation,
  createDelegationReport,
  createPmOrchestrator,
  acquirePmLock,
  attachHostWorker,
  requiredHostCapabilitiesForDeliveryMode,
  readPmSession,
  readDelegation,
  listDelegations,
  updateDelegationState
} from "../dist/pm/index.js";

const workflowRoot = resolve("aix/workflows/design-plan-execute");

test("PM starts with a lease, reconciles, dispatches, and reuses compatible workers", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-orchestrator-"));
  const host = new FakeNativeHost();
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });

  assert.equal(pm.status().workflow, "design-plan-execute");
  assert.equal(pm.status().delegations.length, 0);
  assert.equal(readPmSession(projectRoot).lease?.sessionId, pm.session.record.sessionId);
  await assert.rejects(() => pm.dispatch({
    role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change",
    goal: "Widen scope.", constraints: [], acceptanceSignals: [], returnRequirements: [], allowedPaths: [".git/config"]
  }), /exceeds the declared domain/);

  const first = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    reuseKey: "quality", goal: "Check the focused tests.", constraints: ["Do not edit source."],
    acceptanceSignals: ["Return commands and results."], returnRequirements: ["Summary", "Evidence"]
  });
  const second = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", reuseKey: "quality",
    goal: "Check the next focused tests.", constraints: ["Do not edit source."],
    acceptanceSignals: ["Return commands and results."], returnRequirements: ["Summary", "Evidence"]
  });

  assert.equal(first.record.state, "completed");
  assert.deepEqual(first.record.capabilitySnapshot, {
    provider: "fake", harness: "fake-native", model: "fake-model", runtime: "test",
    discoveredAt: first.record.capabilitySnapshot.discoveredAt,
    capabilities: {
      "correlated-results": true, "native-worker-creation": true, "worker-follow-up": true,
      "worker-stop": true, "worker-streaming": true, "workspace-binding": true, "workspace-write": true,
      "managed-local-integration": true
    }
  });
  assert.deepEqual(JSON.parse(readFileSync(`${projectRoot}/.aix/pm/delegations/${first.record.contract.identity.delegationId}/record.json`, "utf8")).capabilitySnapshot, first.record.capabilitySnapshot);
  assert.deepEqual(first.report, {
    role: "quality-engineer",
    delegationId: first.record.contract.identity.delegationId,
    subagentId: first.record.contract.identity.subagentId,
    hostWorkerId: first.worker.hostWorkerId,
    displayName: "Quality Engineer",
    status: "completed",
    summary: "Fake worker completed with correlated evidence."
  });
  assert.equal(second.reused, true);
  assert.equal(host.workers.length, 1);
  assert.equal(host.followUps.length, 1);
  assert.equal(pm.status().delegations.length, 2);
  pm.close();
  assert.equal(readPmSession(projectRoot).lease?.expiresAt, "1970-01-01T00:00:00.000Z");
});

test("delegation report preserves host-provided display names when available", () => {
  const record = {
    contract: {
      identity: { delegationId: "delegation-report", subagentId: "subagent-report", displayName: "Security Engineer" },
      authority: { role: "security-engineer" }
    }
  };
  const report = createDelegationReport(record, {
    hostWorkerId: "host-worker-report",
    subagentId: "subagent-report",
    displayName: "Security Engineer",
    hostDisplayName: "Carson"
  }, {
    hostWorkerId: "host-worker-report",
    subagentId: "subagent-report",
    delegationId: "delegation-report",
    status: "blocked",
    result: "Needs clarification."
  });
  assert.equal(report.hostDisplayName, "Carson");
  assert.equal(report.status, "blocked");
});

test("PM startup reconciles incomplete records and refuses parent artifact writes", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-recovery-"));
  const record = createDelegation({
    projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Inspect tests.", constraints: [], acceptanceSignals: [], allowedPaths: [], deniedPaths: ["src/"],
    requiredAccess: ["read"], stopConditions: ["scope unclear"], returnRequirements: ["summary"]
  });
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const recovered = pm.status().delegations.find((item) => item.delegationId === record.contract.identity.delegationId);
  assert.equal(recovered?.state, "unknown");
  assert.throws(() => assertPmArtifactWriteForbidden("src/index.ts"), /cannot directly modify project artifacts/);
  await pm.recover(record.contract.identity.delegationId, "retry");
  assert.equal(pm.status().delegations.find((item) => item.delegationId === record.contract.identity.delegationId)?.state, "superseded");
  pm.close();
});

test("delegation capability snapshot remains available after recovery", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-snapshot-recovery-"));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const dispatched = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Audit the delegation.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  const snapshot = dispatched.record.capabilitySnapshot;
  const recovered = await pm.recover(dispatched.record.contract.identity.delegationId, "stop");
  assert.deepEqual(recovered.capabilitySnapshot, snapshot);
  assert.deepEqual(readDelegation(projectRoot, dispatched.record.contract.identity.delegationId).capabilitySnapshot, snapshot);
  assert.deepEqual(pm.status().delegations[0].capabilitySnapshot, snapshot);
  pm.close();
});

test("tampered capability snapshots are rejected by recovery and audit access", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-snapshot-tamper-"));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const dispatched = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Audit the delegation.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  const recordPath = `${projectRoot}/.aix/pm/delegations/${dispatched.record.contract.identity.delegationId}/record.json`;
  const persisted = JSON.parse(readFileSync(recordPath, "utf8"));
  persisted.capabilitySnapshot.capabilities["api-token"] = true;
  writeFileSync(recordPath, `${JSON.stringify(persisted)}\n`);
  assert.throws(() => pm.status(), /raw secret fields/);
  await assert.rejects(() => pm.recover(dispatched.record.contract.identity.delegationId, "verify"), /raw secret fields/);
  pm.close();
});

test("write-producing delegations require managed local integration while report-only remains available", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-managed-local-capability-"));
  const host = new FakeNativeHost({ capabilities: { "managed-local-integration": false } });
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });

  await assert.rejects(() => pm.dispatch({
    role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change",
    goal: "Apply an isolated change.", constraints: [], acceptanceSignals: [], returnRequirements: []
  }), /managed-local-integration/);
  assert.deepEqual(requiredHostCapabilitiesForDeliveryMode("local-change"), ["managed-local-integration"]);
  assert.deepEqual(requiredHostCapabilitiesForDeliveryMode("isolated-change"), ["managed-local-integration"]);
  assert.deepEqual(requiredHostCapabilitiesForDeliveryMode("report-only"), []);

  const report = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Inspect the implementation.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  assert.equal(report.record.state, "completed");
  pm.close();
});

test("host-provided managed local integration authorizes an isolated-change delegation", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-managed-local-success-"));
  const host = new FakeNativeHost();
  const workspaceManager = {
    create(input) {
      return { workspaceId: `workspace-${input.delegationId}`, delegationId: input.delegationId, path: projectRoot, baseRevision: "test", integrationTarget: "test", ownerSessionId: input.ownerSessionId, allowedPaths: input.allowedPaths, deniedPaths: input.deniedPaths, state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: [] };
    },
    integrate(workspace) { return { ...workspace, state: "integrated" }; },
    cleanup(workspace) { return { ...workspace, state: "cleaned" }; },
    status() { return { clean: true, changedPaths: [], outOfScopePaths: [] }; }
  };
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host, workspaceManager });

  const result = await pm.dispatch({
    role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change",
    goal: "Apply an isolated change.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  assert.equal(result.record.state, "completed");
  assert.equal(host.workers[0].contract.authority.deliveryMode, "isolated-change");
  pm.close();
});

test("orchestrator durably queues at host capacity and reports group state", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-queue-"));
  let releaseWorker;
  const workerGate = new Promise((resolve) => { releaseWorker = resolve; });
  const host = new FakeNativeHost({ workerAction: async () => workerGate });
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });
  const firstPromise = pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", groupId: "group-one",
    goal: "Hold the first worker.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const secondPromise = pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", groupId: "group-two",
    goal: "Queue behind capacity.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const queued = pm.status().delegations.find((item) => item.state === "queued");
  assert.equal(queued?.state, "queued");
  assert.match(queued?.schedulingReason, /concurrency|active/);
  releaseWorker();
  await firstPromise;
  await secondPromise;
  assert.equal(pm.status().delegations.every((item) => item.state === "completed"), true);
  pm.close();
});

test("PM restart resumes safe persisted queued assignments with a replacement identity", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-restart-queue-"));
  const queued = createDelegation({
    projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", goal: "Resume this queued check.",
    constraints: [], acceptanceSignals: [], returnRequirements: ["Summary"], allowedPaths: [], deniedPaths: ["src/"], requiredAccess: ["read"], stopConditions: ["scope unclear"],
    scheduling: { groupId: "restart-group", dependencies: [], writeDomains: [], sharedArtifacts: [] }
  });
  updateDelegationState(projectRoot, queued.contract.identity.delegationId, "queued", "Waiting for host capacity.");
  const host = new FakeNativeHost();
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });
  assert.equal(host.workers.length, 1);
  assert.equal(readDelegation(projectRoot, queued.contract.identity.delegationId).state, "superseded");
  assert.equal(pm.status().delegations.some((record) => record.state === "completed" && /normalized|split|group/i.test(record.groupRationale || "")), true);
  pm.close();
});

for (const failureStage of ["create", "brief", "result"]) {
  test(`native ${failureStage} failure persists a correlated failed transition`, async () => {
    class FailingHost extends FakeNativeHost {
      async createWorker(request) {
        if (failureStage === "create") throw new Error("native create failed");
        return super.createWorker(request);
      }
      async sendBrief(worker, brief) {
        if (failureStage === "brief") throw new Error("native brief failed");
        return super.sendBrief(worker, brief);
      }
      async waitForResult(worker) {
        if (failureStage === "result") throw new Error("native result failed");
        return super.waitForResult(worker);
      }
    }
    const projectRoot = await mkdtemp(join(tmpdir(), `aix-pm-failure-${failureStage}-`));
    const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FailingHost() });
    await assert.rejects(() => pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", goal: `Fail at ${failureStage}`, constraints: [], acceptanceSignals: [], returnRequirements: [] }), /native/);
    const failed = listDelegations(projectRoot).find((record) => record.goal === `Fail at ${failureStage}`);
    assert.equal(failed?.state, "failed");
    assert.match(readFileSync(`${projectRoot}/.aix/pm/delegations/${failed.contract.identity.delegationId}/events.jsonl`, "utf8"), /failure-recovery/);
    pm.close();
  });
}

test("grouping decisions retain a durable PM rationale", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-group-rationale-"));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const result = await pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", groupId: "explicit-group", goal: "Record grouping.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  assert.match(result.record.scheduling.rationale, /normalized/);
  assert.equal(result.record.scheduling.decisionKind, "grouped");
  assert.equal(result.record.scheduling.groupId.startsWith("group-"), true);
  pm.close();
});

test("related tasks reuse one worker assignment through their canonical group", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-group-worker-reuse-"));
  const host = new FakeNativeHost();
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });
  const first = await pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", groupId: "phase-10-quality", goal: "Inspect scheduler tests.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  const second = await pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", groupId: "phase-10-quality", goal: "Inspect integration tests.", constraints: [], acceptanceSignals: [], returnRequirements: [] });

  assert.equal(first.record.scheduling.groupId, second.record.scheduling.groupId);
  assert.equal(second.reused, true);
  assert.equal(second.worker.hostWorkerId, first.worker.hostWorkerId);
  assert.equal(host.workers.length, 1);
  assert.equal(host.followUps.length, 1);
  pm.close();
});

test("independent read-only groups dispatch concurrently", async () => {
  class ConcurrentHost extends FakeNativeHost {
    waiters = [];
    waitCalls = 0;
    async reportConcurrency() { return { active: 0, limit: 2 }; }
    async waitForResult(worker) {
      this.waitCalls += 1;
      return new Promise((resolve) => {
        this.waiters.push({ worker, resolve });
        if (this.waiters.length === 2) {
          for (const item of this.waiters) item.resolve({ hostWorkerId: item.worker.hostWorkerId, subagentId: item.worker.subagentId, delegationId: this.workers.find((request) => request.contract.identity.subagentId === item.worker.subagentId).contract.identity.delegationId, status: "completed", result: "concurrent read-only result" });
        }
      });
    }
  }
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-read-only-parallel-"));
  const host = new ConcurrentHost();
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });
  const first = pm.dispatch({ role: "technical-architect", taskMode: "verification", deliveryMode: "report-only", groupId: "reader-one", goal: "Read one.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  const second = pm.dispatch({ role: "technical-architect", taskMode: "verification", deliveryMode: "report-only", groupId: "reader-two", goal: "Read two.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  for (let attempt = 0; attempt < 20 && host.waitCalls < 2; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(host.waitCalls, 2);
  const results = await Promise.all([first, second]);
  assert.equal(results.every((result) => result.record.state === "completed"), true);
  assert.equal(results.every((result) => result.record.scheduling.decisionKind === "split"), true);
  for (const result of results) assert.match(readFileSync(`${projectRoot}/.aix/pm/delegations/${result.record.contract.identity.delegationId}/events.jsonl`, "utf8"), /"decision":"parallel"/);
  pm.close();
});

test("concurrent isolated results integrate one at a time and preserve conflicts", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-concurrent-integration-"));
  let active = 0;
  let maximum = 0;
  const workspaceManager = {
    create(input) { return { workspaceId: `workspace-${input.delegationId}`, delegationId: input.delegationId, path: projectRoot, baseRevision: "test", integrationTarget: "test", ownerSessionId: input.ownerSessionId, allowedPaths: input.allowedPaths, deniedPaths: input.deniedPaths, state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: [] }; },
    status() { return { clean: true, changedPaths: [], outOfScopePaths: [] }; },
    async integrate(workspace, operation) { active += 1; maximum = Math.max(maximum, active); await new Promise((resolve) => setTimeout(resolve, 5)); await operation?.({}); active -= 1; return { ...workspace, state: "integrated" }; },
    cleanup(workspace) { return { ...workspace, state: "cleaned" }; }
  };
  const host = new FakeNativeHost();
  host.reportConcurrency = async () => ({ active: 0, limit: 2 });
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host, workspaceManager });
  const results = await Promise.all(["src/one.ts", "src/two.ts"].map((path, index) => pm.dispatch({ role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", groupId: `integration-group-${index + 1}`, allowedPaths: [path], goal: `Integrate ${path}`, constraints: [], acceptanceSignals: [], returnRequirements: [] })));
  assert.equal(maximum, 1);
  assert.equal(results.every((result) => result.record.state === "completed"), true);
  pm.close();
});

test("integration failure persists blocked recovery state and skips cleanup", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-integration-failure-"));
  let cleanupCalled = false;
  const workspaceManager = {
    create(input) { return { workspaceId: `workspace-${input.delegationId}`, delegationId: input.delegationId, path: projectRoot, baseRevision: "test", integrationTarget: "test", ownerSessionId: input.ownerSessionId, allowedPaths: input.allowedPaths, deniedPaths: input.deniedPaths, state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: ["src/failure.ts"] }; },
    status() { return { clean: false, changedPaths: ["src/failure.ts"], outOfScopePaths: [] }; },
    async integrate() { throw new Error("conflicting parent workspace"); },
    cleanup() { cleanupCalled = true; throw new Error("cleanup must not run"); }
  };
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost(), workspaceManager });
  await assert.rejects(() => pm.dispatch({ role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", allowedPaths: ["src/failure.ts"], goal: "Trigger integration recovery.", constraints: [], acceptanceSignals: [], returnRequirements: [] }), /conflicting parent workspace/);
  const record = listDelegations(projectRoot).find((candidate) => candidate.goal === "Trigger integration recovery.");
  assert.equal(record?.state, "blocked");
  assert.equal(cleanupCalled, false);
  pm.close();
});

test("cleanup exception retains the isolated workspace in recovery", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-cleanup-failure-"));
  const workspaceManager = {
    create(input) { return { workspaceId: `workspace-${input.delegationId}`, delegationId: input.delegationId, path: projectRoot, baseRevision: "base", integrationTarget: "HEAD", ownerSessionId: input.ownerSessionId, allowedPaths: input.allowedPaths, deniedPaths: input.deniedPaths, state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: ["src/cleanup.ts"] }; },
    status() { return { clean: false, changedPaths: ["src/cleanup.ts"], outOfScopePaths: [] }; },
    integrate(workspace) { return { ...workspace, state: "integrated" }; },
    cleanup() { throw new Error("cleanup refused"); }
  };
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost(), workspaceManager });
  await assert.rejects(() => pm.dispatch({ role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", allowedPaths: ["src/cleanup.ts"], goal: "Trigger cleanup recovery.", constraints: [], acceptanceSignals: [], returnRequirements: [] }), /cleanup refused/);
  const record = listDelegations(projectRoot).find((candidate) => candidate.goal === "Trigger cleanup recovery.");
  assert.equal(record?.state, "blocked");
  assert.match(readFileSync(`${projectRoot}/.aix/pm/delegations/${record.contract.identity.delegationId}/events.jsonl`, "utf8"), /failure-recovery/);
  pm.close();
});

test("paused recovery persists a held decision and rationale", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-paused-recovery-"));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const result = await pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", goal: "Pause this check.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  const paused = await pm.recover(result.record.contract.identity.delegationId, "pause");
  assert.equal(paused.state, "paused");
  assert.equal(paused.scheduling.decisionKind, "held");
  assert.match(paused.scheduling.reason, /pause/);
  assert.match(readFileSync(`${projectRoot}/.aix/pm/delegations/${paused.contract.identity.delegationId}/events.jsonl`, "utf8"), /"decision":"held"/);
  pm.close();
});

test("orchestrator waits on an external artifact claim and resumes durably", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-cross-session-artifact-"));
  const release = acquirePmLock(projectRoot, "artifact:tests/", "other-pm-session");
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const pending = pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", groupId: "cross-session-artifact", goal: "Wait for external claim.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  await new Promise((resolve) => setTimeout(resolve, 15));
  const waiting = pm.status().delegations.find((record) => record.state === "serialized");
  assert.equal(waiting?.state, "serialized");
  assert.match(waiting?.schedulingReason, /cross-session artifact/);
  release();
  assert.equal((await pending).record.state, "completed");
  pm.close();
});

test("orchestrator recovers from cross-session integration contention", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-cross-session-integration-"));
  const release = acquirePmLock(projectRoot, "parent-workspace-integration", "other-pm-session");
  const workspaceManager = {
    create(input) { return { workspaceId: `workspace-${input.delegationId}`, delegationId: input.delegationId, path: projectRoot, baseRevision: "base", integrationTarget: "HEAD", ownerSessionId: input.ownerSessionId, allowedPaths: input.allowedPaths, deniedPaths: input.deniedPaths, state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: [] }; },
    status() { return { clean: true, changedPaths: [], outOfScopePaths: [] }; },
    async integrate(workspace, operation) { await operation?.({}); return { ...workspace, state: "integrated" }; },
    cleanup(workspace) { return { ...workspace, state: "cleaned" }; }
  };
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost(), workspaceManager });
  const pending = pm.dispatch({ role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", groupId: "cross-session-integration", allowedPaths: ["src/recover.ts"], goal: "Recover integration claim.", constraints: [], acceptanceSignals: [], returnRequirements: [] });
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(pm.status().delegations.find((record) => record.state === "serialized")?.state, "serialized");
  release();
  assert.equal((await pending).record.state, "completed");
  pm.close();
});

test("restart marks active work host-lost while retaining its unlanded workspace", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-host-loss-workspace-"));
  const record = createDelegation({ projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1", role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", goal: "Recover active work.", constraints: [], acceptanceSignals: [], returnRequirements: [], allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], requiredAccess: ["workspace-write"], stopConditions: ["scope unclear"], scheduling: { groupId: "active-restart", rationale: "test recovery", dependencies: [], writeDomains: ["src/"], sharedArtifacts: [] } });
  attachHostWorker(projectRoot, record.contract.identity.delegationId, "host-gone");
  writeFileSync(join(projectRoot, ".aix/pm/delegations", record.contract.identity.delegationId, "workspace.json"), JSON.stringify({ workspaceId: "workspace-active", delegationId: record.contract.identity.delegationId, path: join(projectRoot, ".aix/pm/workspaces", record.contract.identity.delegationId), baseRevision: "base", integrationTarget: "HEAD", ownerSessionId: "old-session", allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: ["src/unlanded.ts"] }));
  class LostHost extends FakeNativeHost { async inspectWorker() { return { state: "unknown" }; } }
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new LostHost() });
  const recovered = pm.status().delegations.find((item) => item.delegationId === record.contract.identity.delegationId);
  assert.equal(recovered?.state, "host-lost");
  assert.equal(existsSync(join(projectRoot, ".aix/pm/delegations", record.contract.identity.delegationId, "workspace.json")), true);
  pm.close();
});

test("restart blocks completed work with an unlanded workspace", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-unlanded-restart-"));
  const record = createDelegation({ projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1", role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change", goal: "Retain unlanded work.", constraints: [], acceptanceSignals: [], returnRequirements: [], allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], requiredAccess: ["workspace-write"], stopConditions: ["scope unclear"], scheduling: { groupId: "unlanded-restart", rationale: "test retention", dependencies: [], writeDomains: ["src/"], sharedArtifacts: [] } });
  updateDelegationState(projectRoot, record.contract.identity.delegationId, "completed", "Worker completed before integration recovery.");
  writeFileSync(join(projectRoot, ".aix/pm/delegations", record.contract.identity.delegationId, "workspace.json"), JSON.stringify({ workspaceId: "workspace-unlanded", delegationId: record.contract.identity.delegationId, path: "unlanded", baseRevision: "base", integrationTarget: "HEAD", ownerSessionId: "old-session", allowedPaths: ["src/"], deniedPaths: [".aix/pm/"], state: "active", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", changedPaths: ["src/unlanded.ts"] }));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  assert.equal(pm.status().delegations.find((item) => item.delegationId === record.contract.identity.delegationId)?.state, "blocked");
  pm.close();
});
