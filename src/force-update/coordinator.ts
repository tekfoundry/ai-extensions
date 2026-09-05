import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { createForceBackup, isCompleteForceBackup, type BackupResult, type ForceUpdateOptions } from "./inventory.js";
import { updateWorkflow } from "../workflows/update.js";
import { updateSkills } from "../activation/update.js";
import { updateRoles } from "../roles/activation.js";
import { verifySkills } from "../activation/verify.js";
import { verifyRoles } from "../roles/verify.js";
import { verifyWorkflow } from "../workflows/commands.js";
import { parseManifest } from "../manifest.js";
import { readJsonObject } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { lockfileAppendBlocks } from "../agents-md.js";
import { MANIFEST_FILE_NAME, LOCKFILE_FILE_NAME } from "../schema.js";
import { AixError } from "../errors.js";
import { compareForceUpdate, deleteForceBackup, type ForceAuditResult } from "./audit.js";

export type ForceUpdateStage = "backup" | "validate" | "workflow" | "skills" | "roles" | "persist" | "cleanup" | "verify" | "complete";
export type ForceUpdateFailure = Exclude<ForceUpdateStage, "complete">;
export interface ForceUpdateStageResult { stage: ForceUpdateStage; completed: boolean; }
export interface ForceUpdateCoordinatorResult {
  state: "updated" | "failed";
  backupPath: string;
  stages: ForceUpdateStageResult[];
  failure?: { stage: ForceUpdateFailure; message: string };
  audit?: ForceAuditResult;
  cleanup?: { decision: "keep" | "delete" | "non-interactive"; retained: boolean; error?: string };
}

const JOURNAL_NAME = "force-update.transaction.json";
const LOCK_NAME = "force-update.lock";

function journalPath(root: string): string { return resolve(root, ".aix", JOURNAL_NAME); }
function lockPath(root: string): string { return resolve(root, ".aix", LOCK_NAME); }
function acquireForceUpdateLock(root: string): void {
  mkdirSync(resolve(root, ".aix"), { recursive: true, mode: 0o700 });
  try {
    // mkdir is an atomic reservation, unlike an existence check followed by a
    // write. A crashed process intentionally leaves this marker so the next
    // invocation fails closed rather than racing an interrupted rebuild.
    mkdirSync(lockPath(root), { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new AixError("Another force update is already running, or a previous process was interrupted; inspect the retained backup before retrying.");
    }
    throw error;
  }
}
function releaseForceUpdateLock(root: string): void { rmSync(lockPath(root), { recursive: true, force: true }); }
function writeJournal(root: string, backupPath: string, stage: ForceUpdateStage, status: "running" | "failed" | "complete", message?: string): void {
  mkdirSync(resolve(root, ".aix"), { recursive: true, mode: 0o700 });
  // The journal is deliberately outside .aix/pm. It makes interruption visible
  // without changing PM records or the validated backup contents.
  writeFileSync(journalPath(root), JSON.stringify({ schemaVersion: 1, backupPath, stage, status, ...(message ? { message } : {}) }, null, 2) + "\n", { mode: 0o600 });
}
function pathIsPackageStore(root: string, path: string): boolean {
  const absolute = resolve(root, path.replace(/[\\\\]+/g, "/"));
  const store = resolve(root, ".agents", "packages");
  const rel = relative(store, absolute);
  if (rel === "" || rel === ".." || rel.startsWith(".." + (path.includes("\\") ? "\\" : "/")) || isAbsolute(rel)) return false;
  // Package cleanup is destructive: reject symlinked ancestors, not just a
  // symlink at the leaf, so a package path cannot redirect deletion outside
  // the managed package store.
  let current = absolute;
  while (current !== store) {
    try { if (lstatSync(current).isSymbolicLink()) return false; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false; }
    current = resolve(current, "..");
  }
  return true;
}
function lockEntries(lockfile: ReturnType<typeof readLockfileJson>): Array<{ packagePath?: string }> {
  return [...(lockfile.skills || []), ...(lockfile.roles || []), ...(lockfile.workflows || [])];
}
function assertRelativeRecordPath(path: string, label: string): void {
  // Lockfiles are portable JSON, so validate both separator conventions even
  // when running on POSIX. Otherwise a Windows-style traversal (..\\target)
  // can pass validation on one host and become dangerous when consumed on
  // another.
  const normalized = path.replace(/[\\\\]+/g, "/");
  if (!normalized || isAbsolute(path) || /^[A-Za-z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new AixError(`Refusing force update with path-invalid ${label}: ${path}`);
  }
}
function assertManagedRecordPath(root: string, path: string, label: string): void {
  assertRelativeRecordPath(path, label);
  const projectRoot = resolve(root);
  const managedRoot = resolve(projectRoot, ".agents");
  try {
    if (lstatSync(managedRoot).isSymbolicLink()) throw new AixError("Refusing force update through symlinked .agents directory.");
  } catch (error) {
    if (error instanceof AixError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const candidate = resolve(projectRoot, path);
  const rel = relative(managedRoot, candidate);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new AixError(`Refusing force update with ${label} outside .agents: ${path}`);
  }
  // Do not let a lockfile turn a managed path into a symlink traversal.
  let current = resolve(candidate, "..");
  while (current !== managedRoot) {
    try {
      if (lstatSync(current).isSymbolicLink()) throw new AixError(`Refusing force update through symlinked ${label}: ${path}`);
    } catch (error) {
      if (error instanceof AixError) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    current = resolve(current, "..");
  }
  try {
    if (lstatSync(candidate).isSymbolicLink()) {
      // Package-store directories are replacement targets and must never be
      // redirected, even to another in-tree asset. Activation paths may be
      // symlinks in the supported layout, but their target must still remain
      // inside the managed root. A dangling link is not safe to replace: its
      // eventual target is untrusted and could redirect a later write outside
      // the managed tree.
      if (label === "package path") throw new AixError(`Refusing force update through symlinked ${label}: ${path}`);
      let target: string;
      try {
        target = realpathSync(candidate);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new AixError(`Refusing force update through dangling symlinked ${label}: ${path}`);
        }
        throw error;
      }
      const targetRelative = relative(managedRoot, target);
      if (targetRelative.startsWith("..") || isAbsolute(targetRelative)) {
        throw new AixError(`Refusing force update through escaped ${label}: ${path}`);
      }
    }
  } catch (error) {
    if (error instanceof AixError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
function validatePriorLockfilePaths(lockfile: ReturnType<typeof readLockfileJson>, root: string): void {
  for (const entry of lockEntries(lockfile)) {
    if (entry.packagePath) assertManagedRecordPath(root, entry.packagePath, "package path");
    const typed = entry as { activationPath?: string; sourcePath?: string; packageFiles?: Array<{ path: string }>; activeFiles?: Array<{ path: string }> };
    if (typed.activationPath) assertManagedRecordPath(root, typed.activationPath, "activation path");
    if (typed.sourcePath) assertRelativeRecordPath(typed.sourcePath, "source path");
    for (const file of [...(typed.packageFiles || []), ...(typed.activeFiles || [])]) {
      assertRelativeRecordPath(file.path, "lockfile file path");
    }
  }
  for (const block of lockfileAppendBlocks(lockfile)) {
    if (block.path !== "AGENTS.md") throw new AixError(`Refusing force update with unsupported managed instruction target: ${block.path}`);
  }
}
function cleanupProvenPackages(root: string, oldLockfile: ReturnType<typeof readLockfileJson>, newLockfile: ReturnType<typeof readLockfileJson>): void {
  const retained = new Set(lockEntries(newLockfile).map((entry) => entry.packagePath).filter(Boolean));
  for (const entry of lockEntries(oldLockfile)) {
    if (!entry.packagePath || retained.has(entry.packagePath) || !pathIsPackageStore(root, entry.packagePath)) continue;
    const target = resolve(root, entry.packagePath.replace(/[\\\\]+/g, "/"));
    if (!pathIsPackageStore(root, entry.packagePath) || !existsSync(target)) continue;
    const stat = lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
    rmSync(target, { recursive: true, force: false });
  }
}
function validatePriorState(root: string): ReturnType<typeof readLockfileJson> {
  if (existsSync(MANIFEST_FILE_NAME)) {
    const manifest = readJsonObject(MANIFEST_FILE_NAME);
    parseManifest(manifest);
  }
  const lockfile = readLockfileJson();
  validatePriorLockfilePaths(lockfile, root);
  return lockfile;
}

/** Backup first, then compose the ordinary update primitives with force-scoped drift bypass. */
export function forceUpdateWorkspace(options: ForceUpdateOptions): ForceUpdateCoordinatorResult {
  const root = resolve(options.projectRoot);
  // The composed update primitives resolve their project files from process
  // cwd. Refuse a mismatched root rather than backing up one workspace and
  // mutating another when this coordinator is called programmatically.
  try {
    if (realpathSync(process.cwd()) !== realpathSync(root)) {
      return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: "Force update project root must match the current working directory." } };
    }
  } catch (error) {
    return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: error instanceof Error ? error.message : String(error) } };
  }
  const runtimeDirectory = resolve(root, ".aix");
  try {
    if (lstatSync(runtimeDirectory).isSymbolicLink()) {
      return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: "Refusing force update through symlinked .aix runtime directory." } };
    }
    const journal = journalPath(root);
    if (existsSync(journal) && lstatSync(journal).isSymbolicLink()) {
      return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: "Refusing force update through symlinked transaction journal." } };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: error instanceof Error ? error.message : String(error) } };
    }
  }
  try {
    acquireForceUpdateLock(root);
  } catch (error) {
    return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: error instanceof Error ? error.message : String(error) } };
  }
  if (existsSync(journalPath(root))) {
    try {
      const prior = JSON.parse(readFileSync(journalPath(root), "utf8")) as { status?: string; backupPath?: string; stage?: ForceUpdateStage };
      if (prior.status === "running" && typeof prior.backupPath === "string" && isCompleteForceBackup(prior.backupPath)) {
        return { state: "failed", backupPath: prior.backupPath, stages: [], failure: { stage: (prior.stage || "backup") as ForceUpdateFailure, message: "An interrupted force update is recorded; inspect or recover the retained backup before retrying." } };
      }
    } catch {
      return { state: "failed", backupPath: "", stages: [], failure: { stage: "backup", message: "Unable to read the force-update transaction journal." } };
    }
  }
  let backup: BackupResult;
  const stages: ForceUpdateStageResult[] = [];
  try {
    backup = createForceBackup(root);
    if (!isCompleteForceBackup(backup.backupPath)) throw new AixError("Force-update backup did not pass completion validation");
    stages.push({ stage: "backup", completed: true });
  } catch (error) {
    releaseForceUpdateLock(root);
    return { state: "failed", backupPath: "", stages, failure: { stage: "backup", message: error instanceof Error ? error.message : String(error) } };
  }
  const backupPath = backup.backupPath;
  let currentStage: ForceUpdateFailure = "validate";
  const injectFailure = (stage: ForceUpdateFailure): void => {
    currentStage = stage;
    if (options.failureInjection === stage) {
      throw new AixError(`Injected force-update failure at ${stage} stage`);
    }
  };
  try {
    currentStage = "validate";
    writeJournal(root, backupPath, "validate", "running");
    injectFailure("validate");
    const oldLockfile = validatePriorState(root);
    stages.push({ stage: "validate", completed: true });
    currentStage = "workflow";
    writeJournal(root, backupPath, "workflow", "running");
    injectFailure("workflow");
    if (existsSync(MANIFEST_FILE_NAME)) updateWorkflow(undefined, { reconcileProtected: true });
    stages.push({ stage: "workflow", completed: true });
    currentStage = "skills";
    writeJournal(root, backupPath, "skills", "running");
    injectFailure("skills");
    if (existsSync(LOCKFILE_FILE_NAME)) updateSkills(undefined, undefined, { reconcileProtected: true });
    stages.push({ stage: "skills", completed: true });
    currentStage = "roles";
    writeJournal(root, backupPath, "roles", "running");
    injectFailure("roles");
    if (existsSync(LOCKFILE_FILE_NAME)) updateRoles(undefined, undefined, { reconcileProtected: true });
    stages.push({ stage: "roles", completed: true });
    // The ordinary update primitives persist manifest/lockfile state. Keep a
    // journaled boundary so persistence failures are distinguishable from
    // subsequent stale-file cleanup failures.
    currentStage = "persist";
    writeJournal(root, backupPath, "persist", "running");
    injectFailure("persist");
    stages.push({ stage: "persist", completed: true });
    currentStage = "cleanup";
    writeJournal(root, backupPath, "cleanup", "running");
    injectFailure("cleanup");
    const newLockfile = readLockfileJson();
    // Revalidate post-update lock data before any destructive cleanup.
    validatePriorLockfilePaths(newLockfile, root);
    cleanupProvenPackages(root, oldLockfile, newLockfile);
    stages.push({ stage: "cleanup", completed: true });
    currentStage = "verify";
    writeJournal(root, backupPath, "verify", "running");
    injectFailure("verify");
    const issues = existsSync(MANIFEST_FILE_NAME) && existsSync(LOCKFILE_FILE_NAME)
      ? [...verifySkills().issues, ...verifyRoles().issues, ...verifyWorkflow().issues]
      : [];
    if (issues.length) throw new AixError(`Verification failed: ${issues.join("; ")}`);
    stages.push({ stage: "verify", completed: true });
    const audit = compareForceUpdate(root, backupPath);
    // Interactive callers prompt after the audit has been rendered. Defer cleanup
    // until they supply an explicit decision; this prevents a pre-prompt default
    // from contradicting the eventual operator choice.
    const cleanupDeferred = options.interactive && options.cleanupDecision === undefined;
    const decision = options.interactive ? (options.cleanupDecision || "keep") : "non-interactive";
    let cleanup: ForceUpdateCoordinatorResult["cleanup"] = cleanupDeferred ? undefined : { decision, retained: true };
    if (!cleanupDeferred && decision === "delete") {
      try { deleteForceBackup(backupPath, root); cleanup = { decision, retained: false }; }
      catch (cleanupError) { cleanup = { decision, retained: true, error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) }; }
    }
    stages.push({ stage: "complete", completed: true });
    writeJournal(root, backupPath, "complete", "complete");
    releaseForceUpdateLock(root);
    return { state: "updated", backupPath, stages, audit, cleanup };
  } catch (error) {
    const stage = currentStage;
    const message = error instanceof Error ? error.message : String(error);
    try { writeJournal(root, backupPath, stage, "failed", message); } catch { /* preserve original failure */ }
    releaseForceUpdateLock(root);
    return { state: "failed", backupPath, stages, failure: { stage, message } };
  }
}
