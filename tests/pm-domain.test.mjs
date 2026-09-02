import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertPmPathInsideProject,
  assertPmRuntimePath,
  delegationPaths,
  ensurePmRuntimeLayout,
  hasPmRuntimeLayout,
  isPmRuntimePath,
  isTerminalDelegationState,
  pmRuntimePaths,
  writePmJsonAtomic,
  assertUtcTimestamp,
  classifyDelegationEvent,
  createDiagnosticLogger,
  isUtcTimestamp,
  utcTimestamp,
  validateDelegationContract,
  validateDelegationEventIdentity,
  validateDelegationState
} from "../dist/pm/index.js";

function contract(overrides = {}) {
  return {
    recordSchemaVersion: 1,
    protocolVersion: 1,
    workflow: "design-plan-execute",
    workflowVersion: "1.0.0",
    pmRoleVersion: "1.0.0",
    identity: {
      subagentId: "implementation-engineer-1",
      delegationId: "delegation-123",
      hostWorkerId: "host-worker-456",
      displayName: "Implementation Engineer",
    },
    authority: {
      role: "implementation-engineer",
      taskMode: "implementation",
      deliveryMode: "isolated-change",
      allowedPaths: ["src/"],
      deniedPaths: [".aix/", "AGENTS.md"],
      requiredAccess: ["workspace:write"],
      stopConditions: ["scope-drift"],
    },
    ...overrides,
  };
}

test("validateDelegationContract accepts the complete PM contract", () => {
  assert.deepEqual(validateDelegationContract(contract()), contract());
});

test("validateDelegationContract rejects unsupported schema and protocol versions", () => {
  assert.throws(() => validateDelegationContract(contract({ protocolVersion: 2 })), /unsupported version 2/);
  assert.throws(() => validateDelegationContract(contract({ recordSchemaVersion: 2 })), /unsupported version 2/);
});

test("validateDelegationContract rejects unsafe identities and unsupported modes", () => {
  assert.throws(
    () => validateDelegationContract(contract({ identity: { ...contract().identity, delegationId: "../escape" } })),
    /identity\.delegationId.*safe identifier/
  );
  assert.throws(
    () => validateDelegationContract(contract({ authority: { ...contract().authority, taskMode: "coding" } })),
    /authority\.taskMode.*scout/
  );
});

test("validateDelegationContract rejects raw secret fields and values", () => {
  assert.throws(() => validateDelegationContract({ ...contract(), apiToken: "secret-value" }), /raw secret fields/);
  assert.throws(() => validateDelegationContract({ ...contract(), note: "Bearer abcdefghijklmnop" }), /raw secret values/);
  assert.doesNotThrow(() => validateDelegationContract({ ...contract(), secretRef: "provider://secret/1" }));
});

test("validateDelegationEventIdentity validates correlation and UTC timestamps", () => {
  assert.deepEqual(
    validateDelegationEventIdentity({
      eventId: "event-1",
      delegationId: "delegation-123",
      subagentId: "implementation-engineer-1",
      sequence: 1,
      timestamp: "2026-09-01T12:00:00.000Z",
      source: "worker",
      hostCorrelationId: "host-event-1",
    }),
    {
      eventId: "event-1",
      delegationId: "delegation-123",
      subagentId: "implementation-engineer-1",
      sequence: 1,
      timestamp: "2026-09-01T12:00:00.000Z",
      source: "worker",
      hostCorrelationId: "host-event-1",
    }
  );
  assert.throws(
    () => validateDelegationEventIdentity({ eventId: "event-1", delegationId: "d", subagentId: "s", sequence: 1, timestamp: "2026-09-01T12:00:00-05:00", source: "worker" }),
    /timestamp.*UTC/
  );
});

test("delegation state helpers distinguish terminal and recoverable states", () => {
  assert.equal(isTerminalDelegationState(validateDelegationState("completed")), true);
  assert.equal(isTerminalDelegationState(validateDelegationState("host-lost")), false);
  assert.equal(isTerminalDelegationState(validateDelegationState("unknown")), false);
  assert.throws(() => validateDelegationState("running"), /must be one of/);
});

test("PM runtime paths stay inside the project and expose the expected layout", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-paths-"));
  const runtime = ensurePmRuntimeLayout(projectRoot);
  const delegation = delegationPaths(projectRoot, "delegation-123");

  assert.equal(hasPmRuntimeLayout(projectRoot), true);
  assert.equal(runtime.root, pmRuntimePaths(projectRoot).root);
  assert.equal(delegation.brief, join(runtime.delegations, "delegation-123", "brief.md"));
  assert.equal(delegation.workspace, join(runtime.workspaces, "delegation-123"));
  assert.doesNotThrow(() => assertPmPathInsideProject(projectRoot, delegation.result));
  assert.equal(isPmRuntimePath(projectRoot, delegation.result), true);
  assert.equal(isPmRuntimePath(projectRoot, join(projectRoot, ".aix", "pm-old", "record.json")), false);
  assert.equal(isPmRuntimePath(projectRoot, join(projectRoot, "outside", "record.json")), false);
  assert.doesNotThrow(() => assertPmRuntimePath(projectRoot, delegation.result));
  assert.throws(() => assertPmRuntimePath(projectRoot, join(projectRoot, ".aix", "pm-old", "record.json")), /cannot directly modify project artifacts/);
  assert.throws(() => delegationPaths(projectRoot, "../outside"), /unsafe path segment/);
  assert.throws(() => assertPmPathInsideProject(projectRoot, join(projectRoot, "..", "outside")), /outside project/);
});

test("PM timestamps serialize and validate as canonical UTC values", () => {
  const date = new Date("2026-09-01T17:00:00.000Z");

  assert.equal(utcTimestamp(date), "2026-09-01T17:00:00.000Z");
  assert.equal(isUtcTimestamp("2026-09-01T17:00:00.000Z"), true);
  assert.equal(isUtcTimestamp("2026-09-01T12:00:00.000-05:00"), false);
  assert.equal(isUtcTimestamp("2026-02-30T00:00:00.000Z"), false);
  assert.doesNotThrow(() => assertUtcTimestamp("2026-09-01T17:00:00.000Z"));
  assert.throws(() => assertUtcTimestamp("2026-09-01T12:00:00-05:00"), /must be an ISO timestamp in UTC/);
});

test("delegation events classify duplicates, stale, out-of-order, and conflicts", () => {
  const first = {
    eventId: "event-1",
    delegationId: "delegation-123",
    subagentId: "implementation-engineer-1",
    sequence: 1,
    timestamp: "2026-09-01T17:00:00.000Z",
    source: "worker",
  };
  const history = { events: [first], lastSequence: 1 };

  assert.equal(classifyDelegationEvent(first, history), "duplicate");
  assert.equal(classifyDelegationEvent({ ...first, eventId: "event-0", sequence: 1 }, history), "conflict");
  assert.equal(classifyDelegationEvent({ ...first, eventId: "event-2", sequence: 2 }, history), "accepted");
  assert.equal(classifyDelegationEvent({ ...first, eventId: "event-3", sequence: 0 }, history), "stale");
  assert.equal(classifyDelegationEvent({ ...first, eventId: "event-4", sequence: 3 }, history), "out-of-order");
});

test("PM JSON records write atomically and reject secrets", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-records-"));
  const recordPath = join(projectRoot, ".aix", "pm", "session.json");

  writePmJsonAtomic(recordPath, { sessionId: "session-1", state: "working" });
  assert.deepEqual(JSON.parse(await readFile(recordPath, "utf8")), {
    sessionId: "session-1",
    state: "working",
  });
  assert.throws(() => writePmJsonAtomic(recordPath, { accessToken: "do-not-persist" }), /raw secret fields/);
});

test("PM atomic writers reject non-canonical project paths", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-boundary-"));

  assert.throws(() => writePmJsonAtomic(join(projectRoot, "_docs", "record.json"), { state: "working" }), /canonical .aix\/pm/);
  assert.throws(() => writePmJsonAtomic(join(projectRoot, ".aix", "pm-old", "record.json"), { state: "working" }), /canonical .aix\/pm/);
  assert.throws(() => writePmJsonAtomic(join(projectRoot, ".aix", "pm", "..", "outside.json"), { state: "working" }), /canonical .aix\/pm/);
});

test("PM atomic writes replace partial crash-left records without leaving temp files", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-crash-"));
  const recordDirectory = join(projectRoot, ".aix", "pm");
  const recordPath = join(recordDirectory, "session.json");

  await mkdir(recordDirectory, { recursive: true });
  await writeFile(recordPath, '{"sessionId":', "utf8");
  await writeFile(`${recordPath}.crash.tmp`, '{"sessionId":"stale"}', "utf8");

  writePmJsonAtomic(recordPath, { sessionId: "session-recovered", state: "created" });

  assert.deepEqual(JSON.parse(await readFile(recordPath, "utf8")), {
    sessionId: "session-recovered",
    state: "created",
  });
  assert.deepEqual((await readdir(recordDirectory)).sort(), ["session.json", "session.json.crash.tmp"]);
});

test("diagnostic logger correlates events, filters levels, redacts secrets, and rotates logs", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-diagnostics-"));
  const logPath = join(projectRoot, ".aix", "pm", "diagnostics", "events.jsonl");
  const logger = createDiagnosticLogger(logPath, {
    minLevel: "info",
    maxBytes: 420,
    maxRotations: 1,
    knownSecrets: ["local-secret"],
    now: () => "2026-09-01T17:00:00.000Z",
  });

  assert.equal(logger.debug("not persisted"), undefined);
  const event = logger.info(
    "dispatch local-secret",
    { sessionId: "session-1", delegationId: "delegation-1", subagentId: "worker-1" },
    { apiToken: "local-secret", detail: "Bearer abcdefghijklmnop" }
  );

  assert.equal(event?.message, "dispatch [REDACTED]");
  assert.deepEqual(event?.context, {
    sessionId: "session-1",
    delegationId: "delegation-1",
    subagentId: "worker-1",
  });
  assert.deepEqual(event?.data, {
    apiToken: "[REDACTED]",
    detail: "[REDACTED]",
  });

  logger.warn("second event", { sessionId: "session-1" }, { payload: "x".repeat(100) });
  logger.error("third event", { sessionId: "session-1" }, { payload: "y".repeat(100) });

  const diagnosticDirectory = join(projectRoot, ".aix", "pm", "diagnostics");
  const rotatedPath = join(diagnosticDirectory, "events.jsonl.1");
  const contents = `${await readFile(logPath, "utf8")}\n${await readFile(rotatedPath, "utf8")}`;
  assert.equal(contents.includes("local-secret"), false);
  assert.equal(contents.includes("abcdefghijklmnop"), false);
  assert.equal((await readdir(diagnosticDirectory)).includes("events.jsonl.1"), true);
});
