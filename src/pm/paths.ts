import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { AixError } from "../errors.js";

export const PM_ROOT_PATH = ".aix/pm";

export interface PmRuntimePaths {
  root: string;
  session: string;
  lease: string;
  delegations: string;
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
    diagnostics: join(root, "diagnostics"),
    workspaces: join(root, "workspaces"),
    locks: join(root, "locks")
  };
}

export function ensurePmRuntimeLayout(projectRoot = process.cwd()): PmRuntimePaths {
  const paths = pmRuntimePaths(projectRoot);

  for (const directory of [paths.root, paths.delegations, paths.diagnostics, paths.workspaces, paths.locks]) {
    mkdirSync(directory, { recursive: true });
  }

  return paths;
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

export function assertPmPathInsideProject(projectRoot: string, candidatePath: string): void {
  const project = resolve(projectRoot);
  const candidate = resolve(candidatePath);
  const relativeCandidate = relative(project, candidate);

  if (relativeCandidate === ".." || relativeCandidate.startsWith(`..${sep}`) || isAbsolute(relativeCandidate)) {
    throw new AixError(`Invalid PM path: ${candidate} is outside project ${project}.`);
  }
}

export function hasPmRuntimeLayout(projectRoot = process.cwd()): boolean {
  const paths = pmRuntimePaths(projectRoot);
  return existsSync(paths.root);
}
