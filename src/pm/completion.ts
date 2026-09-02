import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensurePmRuntimeLayout, pmRuntimePaths } from "./paths.js";
import { writePmJsonAtomic } from "./records.js";
import { assertNoRawSecrets } from "./validation.js";
import { utcTimestamp } from "./time.js";

export type PmCompletionAuthorizationKind = "promotion-success" | "cleanup-waiver";

export interface PmCompletionAuthorization {
  kind: PmCompletionAuthorizationKind;
  recordedAt: string;
  reason: string;
  scope: PmCompletionScope;
}

export interface PmCompletionScope {
  workflow?: string;
  plan?: string;
  delegationIds?: string[];
}

const COMPLETION_FILE = "completion.json";

function completionPath(projectRoot: string): string {
  return join(pmRuntimePaths(projectRoot).root, COMPLETION_FILE);
}

function validateScope(scope: PmCompletionScope): PmCompletionScope {
  if (!scope || typeof scope !== "object" || (!scope.workflow && !scope.plan && (!scope.delegationIds || scope.delegationIds.length === 0))) {
    throw new Error("PM completion authorization requires a workflow, plan, or delegation scope.");
  }
  const result: PmCompletionScope = {};
  for (const key of ["workflow", "plan"] as const) {
    if (scope[key] !== undefined) {
      if (typeof scope[key] !== "string" || scope[key].trim() === "" || scope[key].trim().length > 128) throw new Error(`PM completion ${key} scope must be 1 to 128 characters.`);
      result[key] = scope[key].trim();
    }
  }
  if (scope.delegationIds !== undefined) {
    if (!Array.isArray(scope.delegationIds) || scope.delegationIds.length > 64 || scope.delegationIds.some((id) => typeof id !== "string" || id.trim() === "" || id.trim().length > 128)) throw new Error("PM completion delegation scope must contain at most 64 bounded identifiers.");
    result.delegationIds = scope.delegationIds.map((id) => id.trim());
  }
  return result;
}

function recordAuthorization(projectRoot: string, kind: PmCompletionAuthorizationKind, scope: PmCompletionScope, reason: string): PmCompletionAuthorization {
  const normalizedReason = reason.trim();
  if (normalizedReason.length === 0 || normalizedReason.length > 512) {
    throw new Error("PM completion authorization reason must be between 1 and 512 characters.");
  }
  const authorization = { kind, recordedAt: utcTimestamp(), reason: normalizedReason, scope: validateScope(scope) } satisfies PmCompletionAuthorization;
  assertNoRawSecrets(authorization);
  ensurePmRuntimeLayout(projectRoot);
  writePmJsonAtomic(completionPath(projectRoot), authorization);
  return authorization;
}

export function recordPmPromotionSuccess(projectRoot: string, scope: PmCompletionScope, reason = "Plan completion promotion succeeded."): PmCompletionAuthorization {
  return recordAuthorization(projectRoot, "promotion-success", scope, reason);
}

export function recordPmCleanupWaiver(projectRoot: string, scope: PmCompletionScope, reason: string): PmCompletionAuthorization {
  return recordAuthorization(projectRoot, "cleanup-waiver", scope, reason);
}

/** Lifecycle hook: record the one completion outcome that authorizes cleanup. */
export function authorizePmCleanupAtCompletion(
  projectRoot: string,
  input: { scope: PmCompletionScope; promotionSucceeded?: boolean; waiverReason?: string }
): PmCompletionAuthorization {
  if (input.promotionSucceeded === true) return recordPmPromotionSuccess(projectRoot, input.scope);
  if (input.waiverReason) return recordPmCleanupWaiver(projectRoot, input.scope, input.waiverReason);
  throw new Error("PM completion must record promotion success or an explicit waiver reason before cleanup.");
}

export function readPmCompletionAuthorization(projectRoot: string): PmCompletionAuthorization | undefined {
  const path = completionPath(projectRoot);
  if (!existsSync(path)) return undefined;
  const value = JSON.parse(readFileSync(path, "utf8")) as Partial<PmCompletionAuthorization>;
  if ((value.kind !== "promotion-success" && value.kind !== "cleanup-waiver") || typeof value.recordedAt !== "string" || Number.isNaN(Date.parse(value.recordedAt)) || !value.recordedAt.endsWith("Z") || typeof value.reason !== "string" || value.reason.trim() === "" || value.reason.length > 512 || !value.scope) {
    throw new Error("Invalid PM completion authorization record.");
  }
  assertNoRawSecrets(value);
  return { ...value, scope: validateScope(value.scope) } as PmCompletionAuthorization;
}

export function hasPmCleanupAuthorization(projectRoot: string, workflow: string, delegationId: string): boolean {
  const authorization = readPmCompletionAuthorization(projectRoot);
  if (!authorization) return false;
  return authorization.scope.workflow === workflow || authorization.scope.delegationIds?.includes(delegationId) === true;
}
