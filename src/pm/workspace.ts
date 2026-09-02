import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { AixError } from "../errors.js";
import { delegationPaths, assertPmPathInsideProject } from "./paths.js";
import { writePmJsonAtomic } from "./records.js";
import { utcTimestamp } from "./time.js";

export type WorkspaceState = "active" | "integrated" | "conflict" | "scope-violation" | "cleanup-pending" | "cleaned";

export interface WorkspaceRecord {
  workspaceId: string;
  delegationId: string;
  path: string;
  baseRevision: string;
  integrationTarget: string;
  ownerSessionId: string;
  allowedPaths: string[];
  deniedPaths: string[];
  state: WorkspaceState;
  createdAt: string;
  updatedAt: string;
  changedPaths: string[];
  cleanupReason?: string;
}

export interface WorkspaceStatus {
  clean: boolean;
  changedPaths: string[];
  outOfScopePaths: string[];
}

export interface WorkspaceManager {
  create(input: { delegationId: string; ownerSessionId: string; allowedPaths: string[]; deniedPaths: string[]; integrationTarget?: string }): WorkspaceRecord;
  status(workspace: WorkspaceRecord): WorkspaceStatus;
  integrate(workspace: WorkspaceRecord): WorkspaceRecord;
  cleanup(workspace: WorkspaceRecord): WorkspaceRecord;
}

function git(projectRoot: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AixError(`Workspace git command failed: git ${args.join(" ")} (${message})`);
  }
}

function gitStatus(projectRoot: string): string {
  try {
    return execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: projectRoot, encoding: "utf8" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AixError(`Workspace git status failed (${message})`);
  }
}

function normalizeScope(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function inScope(path: string, scopes: string[]): boolean {
  const normalized = normalizeScope(path);
  return scopes.some((scope) => {
    const prefix = normalizeScope(scope).replace(/\/$/, "");
    return prefix === "" || normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
}

function changedPathsFromStatus(output: string): string[] {
  return output.split(/\r?\n/).filter(Boolean).map((line) => normalizeScope(line.length > 3 ? line.slice(3).replace(/^"|"$/g, "") : line));
}

function workspaceFile(projectRoot: string, delegationId: string): string {
  return join(delegationPaths(projectRoot, delegationId).root, "workspace.json");
}

export function readWorkspace(projectRoot: string, delegationId: string): WorkspaceRecord {
  return JSON.parse(readFileSync(workspaceFile(projectRoot, delegationId), "utf8")) as WorkspaceRecord;
}

export function createGitWorkspaceManager(projectRoot: string, now: () => string = () => utcTimestamp()): WorkspaceManager {
  const root = resolve(projectRoot);
  git(root, ["rev-parse", "--show-toplevel"]);

  return {
    create(input) {
      const paths = delegationPaths(root, input.delegationId);
      const workspacePath = paths.workspace;
      mkdirSync(paths.root, { recursive: true });
      assertPmPathInsideProject(root, workspacePath);
      if (existsSync(workspacePath)) throw new AixError(`Workspace already exists: ${workspacePath}`);
      const baseRevision = git(root, ["rev-parse", "HEAD"]);
      git(root, ["worktree", "add", "--detach", workspacePath, baseRevision]);
      const timestamp = now();
      const record: WorkspaceRecord = {
        workspaceId: `workspace-${input.delegationId}`,
        delegationId: input.delegationId,
        path: workspacePath,
        baseRevision,
        integrationTarget: input.integrationTarget || "HEAD",
        ownerSessionId: input.ownerSessionId,
        allowedPaths: input.allowedPaths,
        deniedPaths: input.deniedPaths,
        state: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
        changedPaths: []
      };
      writePmJsonAtomic(workspaceFile(root, input.delegationId), record);
      return record;
    },
    status(workspace) {
      const output = gitStatus(workspace.path);
      const changedPaths = changedPathsFromStatus(output);
      const outOfScopePaths = changedPaths.filter((path) => !inScope(path, workspace.allowedPaths) || inScope(path, workspace.deniedPaths));
      return { clean: changedPaths.length === 0, changedPaths, outOfScopePaths };
    },
    integrate(workspace) {
      const status = this.status(workspace);
      if (status.outOfScopePaths.length > 0) {
        const updated = { ...workspace, state: "scope-violation" as const, updatedAt: now(), changedPaths: status.changedPaths };
        writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
        throw new AixError(`Workspace changed files outside its delegated scope: ${status.outOfScopePaths.join(", ")}`);
      }
      if (gitStatus(root).trim() !== "") {
        throw new AixError("Integration target has local changes; PM will not merge into a dirty project.");
      }
      if (git(root, ["rev-parse", "HEAD"]) !== workspace.baseRevision) {
        const updated = { ...workspace, state: "conflict" as const, updatedAt: now(), changedPaths: status.changedPaths, cleanupReason: "integration target advanced" };
        writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
        throw new AixError("Integration target advanced after workspace creation; PM requires a fresh integration attempt.");
      }
      if (status.clean) {
        const updated = { ...workspace, state: "integrated" as const, updatedAt: now(), changedPaths: [] };
        writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
        return updated;
      }
      const untracked = status.changedPaths.filter((path) => gitStatus(workspace.path).split(/\r?\n/).some((line) => line.startsWith("??") && normalizeScope(line.slice(3)) === path));
      if (untracked.length > 0) {
        git(workspace.path, ["add", "-N", "--", ...untracked]);
      }
      const patch = execFileSync("git", ["diff", "--binary", workspace.baseRevision, "--", "."], { cwd: workspace.path, encoding: "utf8" });
      try {
        execFileSync("git", ["apply", "--3way", "--check"], { cwd: root, input: patch, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
        execFileSync("git", ["apply", "--3way"], { cwd: root, input: patch, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
      } catch {
        const updated = { ...workspace, state: "conflict" as const, updatedAt: now(), changedPaths: status.changedPaths };
        writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
        throw new AixError("Workspace integration produced conflicts; the PM must delegate repair before cleanup.");
      }
      const updated = { ...workspace, state: "integrated" as const, updatedAt: now(), changedPaths: status.changedPaths };
      writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
      return updated;
    },
    cleanup(workspace) {
      const status = this.status(workspace);
      if (!status.clean && workspace.state !== "integrated") {
        const updated = { ...workspace, state: "cleanup-pending" as const, updatedAt: now(), changedPaths: status.changedPaths, cleanupReason: "workspace contains unmerged changes" };
        writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
        throw new AixError("Workspace cleanup is unsafe because it contains unmerged changes.");
      }
      git(root, ["worktree", "remove", ...(workspace.state === "integrated" ? ["--force"] : []), workspace.path]);
      const updated = { ...workspace, state: "cleaned" as const, updatedAt: now(), changedPaths: [] };
      writePmJsonAtomic(workspaceFile(root, workspace.delegationId), updated);
      return updated;
    }
  };
}
