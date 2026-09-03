import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { AixError } from "../errors.js";
import { pmRuntimePaths, ensurePmRuntimeLayout } from "./paths.js";
import { writePmJsonAtomic } from "./records.js";
import { utcTimestamp } from "./time.js";

export interface PmLockRecord {
  key: string;
  ownerSessionId: string;
  acquiredAt: string;
  expiresAt: string;
}

function lockPath(projectRoot: string, key: string): string {
  const digest = createHash("sha256").update(key).digest("hex");
  return `${ensurePmRuntimeLayout(projectRoot).locks}/${digest}.json`;
}

function lockRecordPath(path: string): string {
  return `${path}/record.json`;
}

export function acquirePmLock(projectRoot: string, key: string, ownerSessionId: string, ttlMs = 30 * 60 * 1000): () => void {
  const path = lockPath(projectRoot, key);
  const now = utcTimestamp();
  let existing: PmLockRecord | undefined;
  if (existsSync(path)) {
    const recordPath = lockRecordPath(path);
    if (!existsSync(recordPath)) throw new AixError(`PM lock is invalid for ${key}; refusing takeover.`);
    existing = JSON.parse(readFileSync(recordPath, "utf8")) as PmLockRecord;
  }

  if (existing && existing.expiresAt > now && existing.ownerSessionId !== ownerSessionId) {
    throw new AixError(`PM lock is held for ${key}.`);
  }

  const record: PmLockRecord = {
    key,
    ownerSessionId,
    acquiredAt: now,
    expiresAt: new Date(Date.parse(now) + ttlMs).toISOString()
  };
  if (existing && existing.expiresAt <= now) rmSync(path, { recursive: true, force: true });
  try {
    mkdirSync(path);
  } catch {
    throw new AixError(`PM lock is held for ${key}.`);
  }
  writePmJsonAtomic(lockRecordPath(path), record);

  return () => {
    if (!existsSync(path)) return;
    const recordPath = lockRecordPath(path);
    if (!existsSync(recordPath)) return;
    const current = JSON.parse(readFileSync(recordPath, "utf8")) as PmLockRecord;
    if (current.ownerSessionId === ownerSessionId) {
      writePmJsonAtomic(recordPath, { ...current, expiresAt: new Date(0).toISOString() });
      rmSync(path, { recursive: true, force: true });
    }
  };
}

export function acquireDelegationLock(projectRoot: string, delegationId: string, ownerSessionId: string): () => void {
  return acquirePmLock(projectRoot, `delegation:${delegationId}`, ownerSessionId);
}

export function acquireArtifactLock(projectRoot: string, artifactPath: string, ownerSessionId: string): () => void {
  return acquirePmLock(projectRoot, `artifact:${artifactPath}`, ownerSessionId);
}

export function acquireIntegrationLock(projectRoot: string, ownerSessionId: string): () => void {
  return acquirePmLock(projectRoot, "parent-workspace-integration", ownerSessionId);
}

export async function waitForPmLock(
  projectRoot: string,
  key: string,
  ownerSessionId: string,
  options: { pollMs?: number; maxWaitMs?: number; onWait?: () => void } = {}
): Promise<() => void> {
  const pollMs = options.pollMs ?? 10;
  const maxWaitMs = options.maxWaitMs ?? 30 * 60 * 1000;
  const started = Date.now();
  let reportedWait = false;
  while (true) {
    try {
      return acquirePmLock(projectRoot, key, ownerSessionId);
    } catch (error) {
      if (!(error instanceof AixError) || !error.message.includes("PM lock is held")) throw error;
      if (!reportedWait) {
        reportedWait = true;
        options.onWait?.();
      }
      if (Date.now() - started >= maxWaitMs) throw new AixError(`Timed out waiting for PM lock ${key}; refusing unsafe continuation.`);
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}
