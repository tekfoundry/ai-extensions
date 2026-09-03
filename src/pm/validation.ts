import { AixError } from "../errors.js";
import {
  DELEGATION_STATES,
  DELIVERY_MODES,
  PM_PROTOCOL_VERSION,
  PM_RECORD_SCHEMA_VERSION,
  TASK_MODES,
  type DelegationContract,
  type DelegationEventIdentity,
  type DelegationState,
  type DeliveryMode,
  type TaskMode
} from "./types.js";

const SECRET_KEY_PATTERN = /(?:password|secret|token|api[_-]?key|private[_-]?key|credential)/i;
const RAW_SECRET_PATTERN = /-----BEGIN [^-]+ PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|\b(?:ghp|github_pat|sk)-[A-Za-z0-9_-]{12,}\b/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function fail(path: string, message: string): never {
  throw new AixError(`Invalid PM contract at ${path}: ${message}`);
}

function requireString(value: unknown, path: string, options: { identifier?: boolean } = {}): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(path, "must be a non-empty string.");
  }

  const normalized = value.trim();

  if (options.identifier && !IDENTIFIER_PATTERN.test(normalized)) {
    fail(path, "must be a safe identifier.");
  }

  return normalized;
}

function requireStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    fail(path, "must be an array.");
  }

  return value.map((item, index) => requireString(item, `${path}[${index}]`));
}

function requireEnum<T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    fail(path, `must be one of: ${values.join(", ")}.`);
  }

  return value as T;
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    fail(path, "must be a positive integer.");
  }

  return value as number;
}

function requireIsoTimestamp(value: unknown, path: string): string {
  const timestamp = requireString(value, path);

  if (Number.isNaN(Date.parse(timestamp)) || !timestamp.endsWith("Z")) {
    fail(path, "must be an ISO timestamp in UTC ending with Z.");
  }

  return timestamp;
}

export function assertNoRawSecrets(value: unknown, path = "record"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRawSecrets(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key) && !/Ref$/i.test(key)) {
        fail(`${path}.${key}`, "raw secret fields are not allowed; use an ephemeral reference.");
      }

      assertNoRawSecrets(child, `${path}.${key}`);
    }
    return;
  }

  if (typeof value === "string" && RAW_SECRET_PATTERN.test(value)) {
    fail(path, "raw secret values are not allowed.");
  }
}

export function validateDelegationContract(value: unknown): DelegationContract {
  assertNoRawSecrets(value);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("record", "must be an object.");
  }

  const record = value as Record<string, unknown>;
  const identity = record.identity;
  const authority = record.authority;

  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    fail("identity", "must be an object.");
  }

  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    fail("authority", "must be an object.");
  }

  const identityRecord = identity as Record<string, unknown>;
  const authorityRecord = authority as Record<string, unknown>;

  const recordSchemaVersion = requirePositiveInteger(record.recordSchemaVersion, "recordSchemaVersion");
  const protocolVersion = requirePositiveInteger(record.protocolVersion, "protocolVersion");

  if (recordSchemaVersion !== PM_RECORD_SCHEMA_VERSION) {
    fail("recordSchemaVersion", `unsupported version ${recordSchemaVersion}; expected ${PM_RECORD_SCHEMA_VERSION}.`);
  }

  if (protocolVersion !== PM_PROTOCOL_VERSION) {
    fail("protocolVersion", `unsupported version ${protocolVersion}; expected ${PM_PROTOCOL_VERSION}.`);
  }

  return {
    recordSchemaVersion,
    protocolVersion,
    workflow: requireString(record.workflow, "workflow", { identifier: true }),
    workflowVersion: requireString(record.workflowVersion, "workflowVersion"),
    pmRoleVersion: requireString(record.pmRoleVersion, "pmRoleVersion"),
    identity: {
      subagentId: requireString(identityRecord.subagentId, "identity.subagentId", { identifier: true }),
      delegationId: requireString(identityRecord.delegationId, "identity.delegationId", { identifier: true }),
      ...(identityRecord.hostWorkerId === undefined
        ? {}
        : { hostWorkerId: requireString(identityRecord.hostWorkerId, "identity.hostWorkerId", { identifier: true }) }),
      ...(identityRecord.hostMissionId === undefined
        ? {}
        : { hostMissionId: requireString(identityRecord.hostMissionId, "identity.hostMissionId", { identifier: true }) }),
      ...(identityRecord.hostRunId === undefined
        ? {}
        : { hostRunId: requireString(identityRecord.hostRunId, "identity.hostRunId", { identifier: true }) }),
      displayName: requireString(identityRecord.displayName, "identity.displayName")
    },
    authority: {
      role: requireString(authorityRecord.role, "authority.role", { identifier: true }),
      taskMode: requireEnum(authorityRecord.taskMode, TASK_MODES, "authority.taskMode"),
      deliveryMode: requireEnum(authorityRecord.deliveryMode, DELIVERY_MODES, "authority.deliveryMode"),
      allowedPaths: requireStringArray(authorityRecord.allowedPaths, "authority.allowedPaths"),
      deniedPaths: requireStringArray(authorityRecord.deniedPaths, "authority.deniedPaths"),
      requiredAccess: requireStringArray(authorityRecord.requiredAccess, "authority.requiredAccess"),
      stopConditions: requireStringArray(authorityRecord.stopConditions, "authority.stopConditions")
    }
  };
}

export function validateDelegationEventIdentity(value: unknown): DelegationEventIdentity {
  assertNoRawSecrets(value);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("event", "must be an object.");
  }

  const event = value as Record<string, unknown>;

  return {
    eventId: requireString(event.eventId, "event.eventId", { identifier: true }),
    delegationId: requireString(event.delegationId, "event.delegationId", { identifier: true }),
    subagentId: requireString(event.subagentId, "event.subagentId", { identifier: true }),
    sequence: requirePositiveInteger(event.sequence, "event.sequence"),
    timestamp: requireIsoTimestamp(event.timestamp, "event.timestamp"),
    source: requireEnum(event.source, ["pm", "worker", "provider", "aix"], "event.source"),
    ...(event.hostCorrelationId === undefined
      ? {}
      : { hostCorrelationId: requireString(event.hostCorrelationId, "event.hostCorrelationId", { identifier: true }) })
  };
}

export function isTerminalDelegationState(state: DelegationState): boolean {
  return ["completed", "failed", "cancelled", "expired", "superseded"].includes(state);
}

export function validateDelegationState(value: unknown, path = "state"): DelegationState {
  return requireEnum(value, DELEGATION_STATES, path);
}

export function validateTaskMode(value: unknown, path = "taskMode"): TaskMode {
  return requireEnum(value, TASK_MODES, path);
}

export function validateDeliveryMode(value: unknown, path = "deliveryMode"): DeliveryMode {
  return requireEnum(value, DELIVERY_MODES, path);
}
