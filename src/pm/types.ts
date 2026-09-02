export const PM_PROTOCOL_VERSION = 1;
export const PM_RECORD_SCHEMA_VERSION = 1;

export const TASK_MODES = ["scout", "implementation", "review", "verification"] as const;
export type TaskMode = (typeof TASK_MODES)[number];

export const DELIVERY_MODES = ["report-only", "local-change", "isolated-change"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const DELEGATION_STATES = [
  "created",
  "dispatched",
  "working",
  "needs-decision",
  "blocked",
  "paused",
  "completed",
  "failed",
  "cancelled",
  "expired",
  "superseded",
  "host-lost",
  "unknown"
] as const;
export type DelegationState = (typeof DELEGATION_STATES)[number];

export const TERMINAL_DELEGATION_STATES = [
  "completed",
  "failed",
  "cancelled",
  "expired",
  "superseded"
] as const;

export type TerminalDelegationState = (typeof TERMINAL_DELEGATION_STATES)[number];

export interface DelegationIdentity {
  subagentId: string;
  delegationId: string;
  hostWorkerId?: string;
  displayName: string;
}

export interface DelegationAuthority {
  role: string;
  taskMode: TaskMode;
  deliveryMode: DeliveryMode;
  allowedPaths: string[];
  deniedPaths: string[];
  requiredAccess: string[];
  stopConditions: string[];
}

export interface DelegationContract {
  recordSchemaVersion: number;
  protocolVersion: number;
  workflow: string;
  workflowVersion: string;
  pmRoleVersion: string;
  identity: DelegationIdentity;
  authority: DelegationAuthority;
}

export interface DelegationEventIdentity {
  eventId: string;
  delegationId: string;
  subagentId: string;
  sequence: number;
  timestamp: string;
  source: "pm" | "worker" | "provider" | "aix";
  hostCorrelationId?: string;
}
