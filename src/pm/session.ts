import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { writePmJsonAtomic } from "./records.js";
import { ensurePmRuntimeLayout, pmRuntimePaths } from "./paths.js";
import { utcTimestamp } from "./time.js";
import { AixError } from "../errors.js";

export interface PmSessionRecord {
  sessionId: string;
  startedAt: string;
  lastSeenAt: string;
  pid: number;
  workflow?: string;
  workflowVersion?: string;
  capabilitySnapshot?: unknown;
}

export interface PmLeaseRecord {
  sessionId: string;
  acquiredAt: string;
  expiresAt: string;
  pid: number;
}

export interface PmSessionHandle {
  readonly record: PmSessionRecord;
  readonly lease: PmLeaseRecord;
  refresh(): PmLeaseRecord;
  release(): void;
}

const DEFAULT_LEASE_MS = 30 * 60 * 1000;

function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as T : undefined;
}

export function startPmSession(input: {
  projectRoot?: string;
  workflow?: string;
  workflowVersion?: string;
  now?: () => string;
  leaseMs?: number;
} = {}): PmSessionHandle {
  const projectRoot = input.projectRoot || process.cwd();
  const paths = ensurePmRuntimeLayout(projectRoot);
  const now = input.now || (() => utcTimestamp());
  const startedAt = now();
  const existing = readJson<PmLeaseRecord>(paths.lease);

  if (existing && existing.expiresAt > startedAt) {
    throw new AixError(`A PM session is already active: ${existing.sessionId}`);
  }

  const record: PmSessionRecord = {
    sessionId: `pm-session-${randomUUID()}`,
    startedAt,
    lastSeenAt: startedAt,
    pid: process.pid,
    ...(input.workflow ? { workflow: input.workflow } : {}),
    ...(input.workflowVersion ? { workflowVersion: input.workflowVersion } : {})
  };
  let lease: PmLeaseRecord = {
    sessionId: record.sessionId,
    acquiredAt: startedAt,
    expiresAt: new Date(Date.parse(startedAt) + (input.leaseMs || DEFAULT_LEASE_MS)).toISOString(),
    pid: process.pid
  };

  writePmJsonAtomic(paths.session, record);
  writePmJsonAtomic(paths.lease, lease);

  return {
    record,
    get lease() { return lease; },
    refresh() {
      const refreshedAt = now();
      lease = { ...lease, expiresAt: new Date(Date.parse(refreshedAt) + (input.leaseMs || DEFAULT_LEASE_MS)).toISOString() };
      writePmJsonAtomic(paths.session, { ...record, lastSeenAt: refreshedAt });
      writePmJsonAtomic(paths.lease, lease);
      return lease;
    },
    release() {
      const current = readJson<PmLeaseRecord>(paths.lease);
      if (current?.sessionId === record.sessionId) {
        writePmJsonAtomic(paths.lease, { ...current, expiresAt: new Date(0).toISOString() });
      }
    }
  };
}

export function readPmSession(projectRoot = process.cwd()): { session?: PmSessionRecord; lease?: PmLeaseRecord } {
  const paths = pmRuntimePaths(projectRoot);
  return {
    session: readJson<PmSessionRecord>(paths.session),
    lease: readJson<PmLeaseRecord>(paths.lease)
  };
}

export function assertPmSessionOwner(projectRoot: string, sessionId: string): void {
  const lease = readPmSession(projectRoot).lease;
  if (!lease || lease.sessionId !== sessionId || lease.expiresAt <= utcTimestamp()) {
    throw new AixError("This PM session does not hold the active project lease.");
  }
}

export function updatePmSession(projectRoot: string, sessionId: string, patch: Partial<PmSessionRecord>): PmSessionRecord {
  const paths = pmRuntimePaths(projectRoot);
  const current = readJson<PmSessionRecord>(paths.session);
  if (!current || current.sessionId !== sessionId) throw new AixError("Cannot update an unknown PM session.");
  const updated = { ...current, ...patch, sessionId };
  writePmJsonAtomic(paths.session, updated);
  return updated;
}
