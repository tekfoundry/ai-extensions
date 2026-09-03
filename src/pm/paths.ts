import { existsSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { AixError } from "../errors.js";

export const PM_ROOT_PATH = ".aix/pm";

export interface PmRuntimePaths {
  root: string;
  session: string;
  lease: string;
  delegations: string;
  decisions: string;
  diagnostics: string;
  workspaces: string;
  locks: string;
}

export interface DelegationPaths {
  root: string;
  brief: string;
  status: string;
  result: string;
  events: string;
  workspace: string;
  record: string;
}

function assertSafeSegment(segment: string, label: string): void {
  if (
    segment.trim() === "" ||
    segment === "." ||
    segment === ".." ||
    segment.includes("/") ||
    segment.includes("\\") ||
    segment.includes("\0") ||
    segment.length > 128
  ) {
    throw new AixError(`Invalid PM path ${label}: unsafe path segment.`);
  }
}

function resolveInside(root: string, ...segments: string[]): string {
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, ...segments);
  const relativeTarget = relative(resolvedRoot, target);

  if (relativeTarget === ".." || relativeTarget.startsWith(`..${sep}`) || isAbsolute(relativeTarget)) {
    throw new AixError(`Invalid PM path: resolved path escapes ${resolvedRoot}.`);
  }

  return target;
}

export function pmRuntimePaths(projectRoot = process.cwd()): PmRuntimePaths {
  const root = resolveInside(projectRoot, PM_ROOT_PATH);

  return {
    root,
    session: join(root, "session.json"),
    lease: join(root, "lease.json"),
    delegations: join(root, "delegations"),
    decisions: join(root, "decisions"),
    diagnostics: join(root, "diagnostics"),
    workspaces: join(root, "workspaces"),
    locks: join(root, "locks")
  };
}

export function ensurePmRuntimeLayout(projectRoot = process.cwd()): PmRuntimePaths {
  const paths = pmRuntimePaths(projectRoot);

  for (const directory of [paths.root, paths.delegations, paths.decisions, paths.diagnostics, paths.workspaces, paths.locks]) {
    mkdirSync(directory, { recursive: true });
  }

  return paths;
}

export interface PmDecisionPaths {
  root: string;
  record: string;
  events: string;
}

export function pmDecisionPaths(projectRoot: string, decisionId: string): PmDecisionPaths {
  assertSafeSegment(decisionId, "decisionId");
  const runtime = pmRuntimePaths(projectRoot);
  const root = resolveInside(runtime.decisions, decisionId);
  return { root, record: join(root, "record.json"), events: join(root, "events.jsonl") };
}

export function delegationPaths(projectRoot: string, delegationId: string): DelegationPaths {
  assertSafeSegment(delegationId, "delegationId");
  const runtime = pmRuntimePaths(projectRoot);
  const root = resolveInside(runtime.delegations, delegationId);

  return {
    root,
    brief: join(root, "brief.md"),
    status: join(root, "status.jsonl"),
    result: join(root, "result.md"),
    events: join(root, "events.jsonl"),
    workspace: resolveInside(runtime.workspaces, delegationId),
    record: join(root, "record.json")
  };
}

function isPathWithin(root: string, candidatePath: string): boolean {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidatePath);
  const relativeCandidate = relative(resolvedRoot, resolvedCandidate);
  return relativeCandidate === "" || (relativeCandidate !== ".." && !relativeCandidate.startsWith(`..${sep}`) && !isAbsolute(relativeCandidate));
}

function assertNoSymlinkEscape(root: string, candidatePath: string): void {
  if (!existsSync(root)) return;

  const resolvedRoot = resolve(root);
  const realRoot = realpathSync(resolvedRoot);

  let existing = resolve(candidatePath);
  while (!existsSync(existing)) {
    const parent = resolve(existing, "..");
    if (parent === existing) return;
    existing = parent;
  }

  if (!isPathWithin(realRoot, realpathSync(existing))) {
    throw new AixError(`Invalid PM path: resolved path escapes ${resolvedRoot}.`);
  }
}

/** Return whether a path resolves to the canonical project-local PM runtime. */
export function isPmRuntimePath(projectRoot: string, candidatePath: string): boolean {
  const root = pmRuntimePaths(projectRoot).root;
  return isPathWithin(root, candidatePath) && (() => {
    try {
      assertNoSymlinkEscape(root, candidatePath);
      return true;
    } catch {
      return false;
    }
  })();
}

export function assertPmPathInsideProject(projectRoot: string, candidatePath: string): void {
  const project = resolve(projectRoot);
  const candidate = resolve(candidatePath);

  if (!isPathWithin(project, candidate)) {
    throw new AixError(`Invalid PM path: ${candidate} is outside project ${project}.`);
  }
  assertNoSymlinkEscape(project, candidate);
}

/** Reject parent writes unless their target is inside canonical .aix/pm state. */
export function assertPmRuntimePath(projectRoot: string, candidatePath: string): void {
  assertPmPathInsideProject(projectRoot, candidatePath);
  const runtimeRoot = pmRuntimePaths(projectRoot).root;
  if (existsSync(runtimeRoot) && lstatSync(runtimeRoot).isSymbolicLink()) {
    throw new AixError(`Invalid PM path: canonical PM root must not be a symlink: ${runtimeRoot}`);
  }
  if (!isPathWithin(runtimeRoot, candidatePath)) {
    throw new AixError(`PM and parent contexts cannot directly modify project artifacts: ${candidatePath}`);
  }
}

export function hasPmRuntimeLayout(projectRoot = process.cwd()): boolean {
  const paths = pmRuntimePaths(projectRoot);
  return existsSync(paths.root);
}
