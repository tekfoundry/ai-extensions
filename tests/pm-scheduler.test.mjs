import assert from "node:assert/strict";
import { test } from "node:test";
import { acquirePmLock, createTaskScheduler, formTaskGroup, formTaskGroups, waitForPmLock } from "../dist/pm/index.js";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const read = (id, groupId = id) => ({ id, groupId, mode: "read-only" });
const change = (id, domain, groupId = id) => ({ id, groupId, mode: "change-producing", writeDomains: [domain], requiresIntegration: true });

test("scheduler admits independent groups and serializes integration", () => {
  const scheduler = createTaskScheduler({ concurrency: 2 });
  const states = scheduler.plan([change("one", "src/one.ts"), change("two", "src/two.ts"), change("three", "src/three.ts")]);
  assert.deepEqual(states.map((state) => state.decision), ["active", "active", "queued"]);
  assert.match(scheduler.admitIntegration(states[0].task, [states[1].task]).reason, /serialized/);
});

test("scheduler queues overlapping domains and preserves sequential group context", () => {
  const scheduler = createTaskScheduler({ concurrency: 4 });
  const active = [change("group-step-1", "src/shared.ts", "group")];
  assert.match(scheduler.admit(change("group-step-2", "tests/" , "group"), active).reason, /already active/);
  assert.match(scheduler.admit(change("overlap", "src/shared.ts"), active).reason, /overlap/);
  assert.equal(scheduler.admit(change("independent", "src/other.ts"), active).decision, "active");
});

test("scheduler respects dependencies and host capacity during execution", async () => {
  const scheduler = createTaskScheduler({ concurrencyReport: { active: 0, limit: 2 } });
  const order = [];
  const results = await scheduler.run([read("a", "group-a"), read("b", "group-b"), { ...read("c", "group-c"), dependencies: ["a", "b"] }], async (task) => {
    order.push(`start:${task.id}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
    order.push(`end:${task.id}`);
    return task.id;
  });
  assert.deepEqual([...results.values()].sort(), ["a", "b", "c"]);
  assert.ok(order.indexOf("start:c") > order.indexOf("end:a"));
  assert.ok(order.indexOf("start:c") > order.indexOf("end:b"));
});

test("unknown or insufficient change capabilities fail closed", () => {
  const scheduler = createTaskScheduler({ capabilities: { provider: "x", harness: "x", model: "x", runtime: "x", discoveredAt: "2026-09-02T00:00:00.000Z", capabilities: { "managed-local-integration": "unknown" } } });
  const state = scheduler.admit(change("unsafe", "src/unsafe.ts"));
  assert.equal(state.decision, "queued");
  assert.match(state.reason, /lacks explicit/);
});

test("shared-artifact claims serialize read-only and change-producing tasks", () => {
  const scheduler = createTaskScheduler({ concurrency: 4 });
  const active = [{ id: "reader", groupId: "reader", mode: "read-only", sharedArtifacts: ["team.md"] }];
  const candidate = { id: "writer", groupId: "writer", mode: "change-producing", writeDomains: ["src/"], sharedArtifacts: ["team.md"] };
  const state = scheduler.admit(candidate, active);
  assert.equal(state.decision, "queued");
  assert.match(state.reason, /overlap/);
});

test("PM locks use atomic filesystem claims across owners", async () => {
  const root = await mkdtemp(join(tmpdir(), "aix-pm-lock-"));
  const release = acquirePmLock(root, "shared-artifact", "session-one");
  assert.throws(() => acquirePmLock(root, "shared-artifact", "session-two"), /held/);
  release();
  const releaseAgain = acquirePmLock(root, "shared-artifact", "session-two");
  releaseAgain();
});

test("host capacity accounts for workers already active on the host", () => {
  const scheduler = createTaskScheduler({ concurrencyReport: { active: 1, limit: 2 } });
  assert.equal(scheduler.concurrency, 1);
  assert.equal(scheduler.admit(read("one")).decision, "active");
  assert.equal(scheduler.admit(read("two"), [read("one")]).decision, "queued");
  const full = createTaskScheduler({ concurrencyReport: { active: 2, limit: 2 } });
  assert.equal(full.concurrency, 0);
  assert.equal(full.admit(read("held")).decision, "queued");
});

test("host capacity refresh accounts for local workers and changing host reports", () => {
  const scheduler = createTaskScheduler({ concurrencyReport: { active: 1, limit: 2 } });
  assert.equal(scheduler.refreshCapacity({ active: 1, limit: 2 }, 0), 1);
  assert.equal(scheduler.refreshCapacity({ active: 2, limit: 2 }, 1), 1);
  assert.equal(scheduler.refreshCapacity({ active: 2, limit: 2 }, 0), 0);
  assert.equal(scheduler.admit(read("held")).decision, "queued");
  assert.equal(scheduler.refreshCapacity({ active: 0, limit: 2 }, 0), 2);
  assert.equal(scheduler.admit(read("free")).decision, "active");
});

test("group formation normalizes caller IDs and records policy rationale", () => {
  const formed = formTaskGroup({ role: "implementation-engineer", taskMode: "implementation", requestedGroupId: "arbitrary", writeDomains: ["src/pm"], serialization: "group" });
  assert.match(formed.groupId, /^group-[a-f0-9]{12}$/);
  assert.match(formed.rationale, /arbitrary was normalized/);
  assert.equal(formed.decisionKind, "grouped");
  assert.throws(() => formTaskGroup({ role: "x", taskMode: "x", requestedGroupId: "../unsafe" }), /safe identifier/);
});

test("cross-session lock contention waits and records a wait decision", async () => {
  const root = await mkdtemp(join(tmpdir(), "aix-pm-lock-wait-"));
  const release = acquirePmLock(root, "artifact:shared", "session-one");
  let waited = false;
  const waiting = waitForPmLock(root, "artifact:shared", "session-two", { pollMs: 2, maxWaitMs: 100, onWait: () => { waited = true; } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  release();
  const releaseTwo = await waiting;
  releaseTwo();
  assert.equal(waited, true);
});

test("canonical group formation groups related plan tasks and splits independent work", () => {
  const groups = formTaskGroups([
    { ...change("plan-a", "src/a.ts"), dependencies: [] },
    { ...change("plan-b", "src/b.ts"), dependencies: ["plan-a"] },
    { ...read("plan-c"), dependencies: [] }
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find((group) => group.taskIds.includes("plan-a"))?.taskIds, ["plan-a", "plan-b"]);
  assert.equal(groups.find((group) => group.taskIds.includes("plan-c"))?.decisionKind, "split");
  assert.match(groups[0].rationale, /canonical plan relationships/);
});
