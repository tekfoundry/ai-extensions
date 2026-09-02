import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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

export function acquirePmLock(projectRoot: string, key: string, ownerSessionId: string, ttlMs = 30 * 60 * 1000): () => void {
  const path = lockPath(projectRoot, key);
  const now = utcTimestamp();
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as PmLockRecord : undefined;

  if (existing && existing.expiresAt > now && existing.ownerSessionId !== ownerSessionId) {
    throw new AixError(`PM lock is held for ${key}.`);
  }

  const record: PmLockRecord = {
    key,
    ownerSessionId,
    acquiredAt: now,
    expiresAt: new Date(Date.parse(now) + ttlMs).toISOString()
  };
  writePmJsonAtomic(path, record);

  return () => {
    if (!existsSync(path)) return;
    const current = JSON.parse(readFileSync(path, "utf8")) as PmLockRecord;
    if (current.ownerSessionId === ownerSessionId) {
      writePmJsonAtomic(path, { ...current, expiresAt: new Date(0).toISOString() });
    }
  };
}

export function acquireDelegationLock(projectRoot: string, delegationId: string, ownerSessionId: string): () => void {
  return acquirePmLock(projectRoot, `delegation:${delegationId}`, ownerSessionId);
}

export function acquireArtifactLock(projectRoot: string, artifactPath: string, ownerSessionId: string): () => void {
  return acquirePmLock(projectRoot, `artifact:${artifactPath}`, ownerSessionId);
}
