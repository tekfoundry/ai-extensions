import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { listDelegations, type DelegationRecord } from "./delegation.js";
import { delegationPaths, pmRuntimePaths, assertPmRuntimePath } from "./paths.js";
import { writePmJsonAtomic } from "./records.js";
import { readWorkspace, type WorkspaceRecord } from "./workspace.js";
import { TERMINAL_DELEGATION_STATES } from "./types.js";
import { hasPmCleanupAuthorization } from "./completion.js";

export interface TidyOptions {
  projectRoot?: string;
  now?: Date;
  olderThanDays?: number;
  includeCompleted?: boolean;
}

export interface TidyCandidate {
  delegationId: string;
  displayName: string;
  state: DelegationRecord["state"];
  updatedAt: string;
  action: "purge" | "hold";
  reason: string;
  workspacePath?: string;
}

export interface TidyReport {
  projectRoot: string;
  cutoff: string;
  includeCompleted: boolean;
  candidates: TidyCandidate[];
  diagnostics: string[];
}

export interface TidyResult {
  report: TidyReport;
  purged: string[];
  purgedDiagnostics: string[];
}

export interface TidyArchiveResult {
  report: TidyReport;
  archived: string[];
}

const DEFAULT_RETENTION_DAYS = 30;
const ACTIVE_STATES = new Set(["created", "queued", "serialized", "dispatched", "working", "needs-decision", "blocked", "paused", "unknown", "host-lost"]);
const ELIGIBLE_DIAGNOSTIC_PATTERN = /^.+\.(?:log|jsonl)(?:\.\d+|\.stale)$/;

function isEligibleDiagnostic(name: string): boolean {
  return ELIGIBLE_DIAGNOSTIC_PATTERN.test(name);
}

function readWorkspaceIfPresent(projectRoot: string, delegationId: string): WorkspaceRecord | undefined {
  const path = delegationPaths(projectRoot, delegationId).root;
  const workspaceFile = join(path, "workspace.json");
  return existsSync(workspaceFile) ? readWorkspace(projectRoot, delegationId) : undefined;
}

function referenceOrHold(projectRoot: string, delegationId: string): string | undefined {
  const paths = delegationPaths(projectRoot, delegationId);
  const files = [paths.brief, paths.status, paths.result, paths.events, paths.record];
  for (const path of files) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    const matches = [
      ["external retention reference", /external[_ -]?reference|retain(?:ed|ing)?|do not purge|no[- ]?purge/i],
      ["plan reference", /(?:^|[^\w])_docs\/plans(?:[\/\s]|$)|plan[-_ ]reference|plan[-_ ]hold|(?:explicit )?hold (?:for|on) (?:the )?plan\b/i],
      ["worktree reference", /worktree[-_ ]reference|unlanded|unmerged|pending merge/i],
      ["unresolved integration", /unresolved integration|integration conflict|integration required/i],
      ["destructive-risk hold", /destructive[-_ ]risk|destructive risk|safety hold/i]
    ] as const;
    const hold = matches.find(([, pattern]) => pattern.test(content))?.[0];
    if (hold) return hold;
  }
  return undefined;
}

function candidateFor(projectRoot: string, record: DelegationRecord, cutoff: Date, includeCompleted: boolean): TidyCandidate {
  const workspace = readWorkspaceIfPresent(projectRoot, record.contract.identity.delegationId);
  const active = ACTIVE_STATES.has(record.state);
  const stale = new Date(record.updatedAt).getTime() <= cutoff.getTime();
  const workspaceUnsafe = Boolean(workspace && workspace.state !== "cleaned" && workspace.state !== "integrated");
  const hold = referenceOrHold(projectRoot, record.contract.identity.delegationId);

  if (active) {
    return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "hold", reason: "active or unresolved delegation", ...(workspace ? { workspacePath: workspace.path } : {}) };
  }
  if (workspaceUnsafe) {
    return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "hold", reason: `workspace requires attention (${workspace?.state})`, workspacePath: workspace?.path };
  }
  if (hold) {
    return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "hold", reason: hold, ...(workspace ? { workspacePath: workspace.path } : {}) };
  }
  if (!hasPmCleanupAuthorization(projectRoot, record.contract.workflow, record.contract.identity.delegationId)) {
    return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "hold", reason: "completion promotion or explicit cleanup waiver required", ...(workspace ? { workspacePath: workspace.path } : {}) };
  }
  const terminalState = TERMINAL_DELEGATION_STATES.find((state) => state === record.state);
  if (terminalState && includeCompleted) {
    return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "purge", reason: "completed data explicitly selected for early cleanup", ...(workspace ? { workspacePath: workspace.path } : {}) };
  }
  if (stale) {
    return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "purge", reason: "inactive beyond retention limit", ...(workspace ? { workspacePath: workspace.path } : {}) };
  }
  return { delegationId: record.contract.identity.delegationId, displayName: record.contract.identity.displayName, state: record.state, updatedAt: record.updatedAt, action: "hold", reason: "within retention period", ...(workspace ? { workspacePath: workspace.path } : {}) };
}

export function previewPmTidy(options: TidyOptions = {}): TidyReport {
  const projectRoot = options.projectRoot || process.cwd();
  const days = options.olderThanDays ?? DEFAULT_RETENTION_DAYS;
  if (!Number.isInteger(days) || days < 0) throw new Error("olderThanDays must be a non-negative integer.");
  const now = options.now || new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const runtime = pmRuntimePaths(projectRoot);
  const diagnostics = existsSync(runtime.diagnostics)
    ? readdirSync(runtime.diagnostics).filter(isEligibleDiagnostic).map((name) => join(runtime.diagnostics, name))
    : [];
  return {
    projectRoot,
    cutoff: cutoff.toISOString(),
    includeCompleted: options.includeCompleted ?? false,
    candidates: listDelegations(projectRoot).map((record) => candidateFor(projectRoot, record, cutoff, options.includeCompleted ?? false)),
    diagnostics
  };
}

export function applyPmTidy(report: TidyReport): TidyResult {
  const purged: string[] = [];
  const purgedDiagnostics: string[] = [];
  const indexPath = join(pmRuntimePaths(report.projectRoot).delegations, "index.json");
  const purgedIds = new Set<string>();
  const freshCandidates = previewPmTidy({ projectRoot: report.projectRoot, now: new Date(), olderThanDays: Math.max(0, Math.ceil((new Date().getTime() - new Date(report.cutoff).getTime()) / 86400000)), includeCompleted: report.includeCompleted }).candidates;
  const freshById = new Map(freshCandidates.map((candidate) => [candidate.delegationId, candidate]));
  for (const candidate of report.candidates.filter((item) => item.action === "purge")) {
    const freshCandidate = freshById.get(candidate.delegationId);
    if (freshCandidate?.action !== "purge") continue;
    const paths = delegationPaths(report.projectRoot, candidate.delegationId);
    assertPmRuntimePath(report.projectRoot, paths.root);
    if (existsSync(paths.root)) {
      rmSync(paths.root, { recursive: true, force: false });
      purged.push(candidate.delegationId);
      purgedIds.add(candidate.delegationId);
    }
    if (freshCandidate.workspacePath && existsSync(freshCandidate.workspacePath)) {
      assertPmRuntimePath(report.projectRoot, freshCandidate.workspacePath);
      rmSync(freshCandidate.workspacePath, { recursive: true, force: false });
    }
  }
  if (purgedIds.size > 0 && existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as { updatedAt?: string; delegations?: string[] };
    writePmJsonAtomic(indexPath, {
      updatedAt: new Date().toISOString(),
      delegations: (index.delegations || []).filter((id) => !purgedIds.has(id))
    });
  }
  const freshDiagnostics = previewPmTidy({ projectRoot: report.projectRoot, now: new Date(), olderThanDays: 0 }).diagnostics;
  for (const diagnosticPath of freshDiagnostics) {
    assertPmRuntimePath(report.projectRoot, diagnosticPath);
    if (existsSync(diagnosticPath)) {
      rmSync(diagnosticPath, { force: false });
      purgedDiagnostics.push(diagnosticPath);
    }
  }
  return { report, purged, purgedDiagnostics };
}

/** Copy eligible datasets to a local archive while leaving the live data intact. */
export function archivePmTidy(report: TidyReport): TidyArchiveResult {
  const fresh = previewPmTidy({ projectRoot: report.projectRoot, now: new Date(), olderThanDays: Math.max(0, Math.ceil((new Date().getTime() - new Date(report.cutoff).getTime()) / 86400000)), includeCompleted: report.includeCompleted });
  const eligible = new Set(fresh.candidates.filter((item) => item.action === "purge").map((item) => item.delegationId));
  const archiveRoot = join(pmRuntimePaths(report.projectRoot).root, "archive", "delegations");
  const archived: string[] = [];
  for (const candidate of report.candidates.filter((item) => item.action === "purge" && eligible.has(item.delegationId))) {
    const source = delegationPaths(report.projectRoot, candidate.delegationId).root;
    const target = join(archiveRoot, candidate.delegationId);
    assertPmRuntimePath(report.projectRoot, source);
    assertPmRuntimePath(report.projectRoot, target);
    if (existsSync(source) && !existsSync(target)) {
      mkdirSync(archiveRoot, { recursive: true });
      cpSync(source, target, { recursive: true, force: false });
      archived.push(candidate.delegationId);
    }
  }
  return { report, archived };
}
