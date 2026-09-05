import { chmodSync, copyFileSync, lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, renameSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import type { Stats } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { AixError } from "../errors.js";
import { hashFile, hashBuffer } from "../fs/hashing.js";

export const FORCE_BACKUP_SCHEMA_VERSION = 1 as const;
export const FORCE_BACKUP_DIRECTORY_PREFIX = "aix_bak_";
export const FORCE_BACKUP_ROOTS = [".agents", ".claude", ".codex"] as const;
export const FORCE_BACKUP_FILES = ["aix.json", "aix.lock.json", "AGENTS.md"] as const;
export const FORCE_BACKUP_METADATA_FILE = "backup-metadata.json";
export const FORCE_BACKUP_INVENTORY_FILE = "backup-inventory.json";
export const FORCE_BACKUP_COMPLETION_FILE = "BACKUP_COMPLETE";

export type ForceUpdateResultState = "backup-created" | "updated" | "failed" | "retained";
export type ForceUpdateFailureState = "invalid-project-root" | "invalid-source" | "incomplete-backup" | "unsupported-file" | "path-collision" | "permission-denied" | "disk-full" | "source-changed";
export type ForceAuditCategory = "user-edited" | "upstream-only" | "legacy-only" | "ambiguous" | "collision";
export type ForceUpdateActor = "project-operator" | "aix-cli" | "package-workflow-source" | "project-owned-content";
export interface ForceUpdateOptions {
  force: true;
  projectRoot: string;
  interactive?: boolean;
  /** Explicit cleanup choice supplied by an interactive caller; omission keeps the backup. */
  cleanupDecision?: "keep" | "delete";
  source?: string;
  /** Deterministic stage failure hook used by isolated coordinator tests. */
  failureInjection?: "backup" | "validate" | "workflow" | "skills" | "roles" | "persist" | "cleanup" | "verify";
}
export interface ForceUpdateResult { state: ForceUpdateResultState; backupPath: string; failure?: ForceUpdateFailureState; }
export interface BackupDeletionApproval { approved: boolean; actor: "project-operator"; interactive: boolean; }

export type ForceBackupRoot = typeof FORCE_BACKUP_ROOTS[number];
export type ForceBackupFile = typeof FORCE_BACKUP_FILES[number];
export type InventoryEntryKind = "file" | "directory" | "symlink";

export interface BackupInventoryEntry {
  path: string;
  kind: InventoryEntryKind;
  mode: number;
  size: number;
  mtimeMs: number;
  sha256?: string;
  linkTarget?: string;
  linkTargetWithinProject?: boolean;
}
export interface BackupInventoryRoot { path: ForceBackupRoot | ForceBackupFile; present: boolean; }
export interface BackupInventory {
  schemaVersion: typeof FORCE_BACKUP_SCHEMA_VERSION;
  roots: BackupInventoryRoot[];
  entries: BackupInventoryEntry[];
}
export interface BackupMetadata {
  schemaVersion: typeof FORCE_BACKUP_SCHEMA_VERSION;
  backupDirectory: string;
  createdAt: string;
  inventorySha256: string;
  completedAt: string;
}
export interface BackupResult { backupPath: string; inventory: BackupInventory; metadata: BackupMetadata; }

export class BackupInventoryError extends AixError {}

function isPathInside(rootPath: string, candidatePath: string): boolean {
  const relativePath = relative(rootPath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== "..");
}
function modeFor(stat: Stats): number { return stat.mode & 0o7777; }

function inventoryEntry(projectRoot: string, path: string): BackupInventoryEntry {
  const stat = lstatSync(path);
  const relativePath = relative(projectRoot, path);
  if (stat.isSymbolicLink()) {
    const linkTarget = readlinkSync(path);
    const resolvedTarget = resolve(dirname(path), linkTarget);
    return { path: relativePath, kind: "symlink", mode: modeFor(stat), size: stat.size, mtimeMs: stat.mtimeMs, linkTarget, linkTargetWithinProject: isPathInside(projectRoot, resolvedTarget) };
  }
  if (stat.isDirectory()) return { path: relativePath, kind: "directory", mode: modeFor(stat), size: stat.size, mtimeMs: stat.mtimeMs };
  if (stat.isFile()) {
    if (stat.nlink > 1) throw new BackupInventoryError(`Refusing to inventory hard-linked file: ${relativePath}`);
    return { path: relativePath, kind: "file", mode: modeFor(stat), size: stat.size, mtimeMs: stat.mtimeMs, sha256: hashFile(path) };
  }
  throw new BackupInventoryError(`Unsupported file type in backup scope: ${relativePath}`);
}
function collectPath(projectRoot: string, path: string, entries: BackupInventoryEntry[]): void {
  const entry = inventoryEntry(projectRoot, path); entries.push(entry);
  if (entry.kind !== "directory") return;
  for (const child of readdirSync(path).sort()) collectPath(projectRoot, join(path, child), entries);
}
function assertProjectRoot(projectRoot: string): string {
  const absoluteRoot = resolve(projectRoot); const stat = lstatSync(absoluteRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new BackupInventoryError(`Project root is not a directory: ${projectRoot}`);
  return absoluteRoot;
}
function rootPresence(root: string, path: string): boolean {
  try { lstatSync(path); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

export function createBackupInventory(projectRoot: string): BackupInventory {
  const absoluteRoot = assertProjectRoot(projectRoot);
  const roots = [...FORCE_BACKUP_ROOTS, ...FORCE_BACKUP_FILES] as const;
  const entries: BackupInventoryEntry[] = []; const rootStatus: BackupInventoryRoot[] = [];
  for (const root of roots) {
    const path = join(absoluteRoot, root); const present = rootPresence(root, path);
    rootStatus.push({ path: root, present }); if (present) collectPath(absoluteRoot, path, entries);
  }
  return { schemaVersion: FORCE_BACKUP_SCHEMA_VERSION, roots: rootStatus, entries: entries.sort((a, b) => a.path.localeCompare(b.path)) };
}

export function isForceBackupPath(path: string): boolean {
  const normalizedPath = normalize(path).replaceAll("\\", "/");
  if (isAbsolute(path) || normalizedPath === ".." || normalizedPath.startsWith("../") || normalizedPath.includes("//")) return false;
  return [...FORCE_BACKUP_ROOTS, ...FORCE_BACKUP_FILES].some((root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`));
}
export function assertForceBackupPath(path: string): void { if (!isForceBackupPath(path)) throw new BackupInventoryError(`Path is outside the force-update backup scope: ${path}`); }

function copyEntry(sourceRoot: string, destinationRoot: string, entry: BackupInventoryEntry): void {
  const source = join(sourceRoot, entry.path); const destination = join(destinationRoot, entry.path);
  assertForceBackupPath(entry.path);
  if (entry.kind === "directory") { mkdirSync(destination, { recursive: true, mode: entry.mode }); chmodSync(destination, entry.mode); return; }
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  if (entry.kind === "symlink") { symlinkSync(entry.linkTarget!, destination); return; }
  copyFileSync(source, destination); chmodSync(destination, entry.mode);
}

function reserveBackupPath(projectRoot: string, timestamp: Date): string {
  const stamp = timestamp.toISOString().replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).*$/, "$1_$2_$3_$4_$5_$6");
  const base = `${FORCE_BACKUP_DIRECTORY_PREFIX}${stamp}`;
  for (let index = 0; index < 10000; index += 1) {
    const suffix = index === 0 ? "" : `_${index}`; const candidate = join(projectRoot, `${base}${suffix}`);
    try { mkdirSync(candidate, { mode: 0o700 }); chmodSync(candidate, 0o700); return candidate; } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new BackupInventoryError("Unable to reserve a unique force-update backup directory");
}

/** Creates a complete backup before callers are allowed to mutate the project. */
export function createForceBackup(projectRoot: string, now = new Date()): BackupResult {
  const absoluteRoot = assertProjectRoot(projectRoot);
  const inventory = createBackupInventory(absoluteRoot);
  const backupPath = reserveBackupPath(absoluteRoot, now);
  try {
    for (const entry of inventory.entries) copyEntry(absoluteRoot, backupPath, entry);
    const after = createBackupInventory(absoluteRoot);
    if (JSON.stringify(after) !== JSON.stringify(inventory)) throw new BackupInventoryError("Source changed while creating force-update backup");
    const inventoryJson = JSON.stringify(inventory, null, 2) + "\n";
    const metadata: BackupMetadata = { schemaVersion: FORCE_BACKUP_SCHEMA_VERSION, backupDirectory: relative(absoluteRoot, backupPath), createdAt: now.toISOString(), inventorySha256: hashBuffer(inventoryJson), completedAt: new Date().toISOString() };
    // Publish each record by rename, and publish the completion marker last. A
    // crash can therefore leave an incomplete backup, but never a marker for a
    // partially-written record.
    const atomicWrite = (name: string, content: string): void => {
      const temporary = join(backupPath, `.${name}.tmp`);
      writeFileSync(temporary, content, { mode: 0o600 });
      renameSync(temporary, join(backupPath, name));
    };
    atomicWrite(FORCE_BACKUP_INVENTORY_FILE, inventoryJson);
    atomicWrite(FORCE_BACKUP_METADATA_FILE, JSON.stringify(metadata, null, 2) + "\n");
    atomicWrite(FORCE_BACKUP_COMPLETION_FILE, `${metadata.inventorySha256}\n`);
    return { backupPath, inventory, metadata };
  } catch (error) {
    rmSync(backupPath, { recursive: true, force: true });
    throw error;
  }
}

function collectBackupPaths(root: string, current = root, paths: string[] = []): string[] {
  for (const name of readdirSync(current)) {
    const path = join(current, name);
    paths.push(relative(root, path));
    const stat = lstatSync(path);
    if (stat.isDirectory() && !stat.isSymbolicLink()) collectBackupPaths(root, path, paths);
  }
  return paths;
}

export function isCompleteForceBackup(backupPath: string): boolean {
  try {
    const backupStat = lstatSync(backupPath);
    if (!backupStat.isDirectory() || backupStat.isSymbolicLink() || !/^(?:aix_bak_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2})(?:_\d+)?$/.test(backupPath.split(sep).pop() ?? "")) return false;
    const metadata = JSON.parse(String(readFileSync(join(backupPath, FORCE_BACKUP_METADATA_FILE)))) as BackupMetadata;
    const inventoryJson = String(readFileSync(join(backupPath, FORCE_BACKUP_INVENTORY_FILE)));
    const inventory = JSON.parse(inventoryJson) as BackupInventory;
    const marker = String(readFileSync(join(backupPath, FORCE_BACKUP_COMPLETION_FILE))).trim();
    if (metadata.schemaVersion !== FORCE_BACKUP_SCHEMA_VERSION || inventory.schemaVersion !== FORCE_BACKUP_SCHEMA_VERSION || metadata.backupDirectory !== relative(dirname(backupPath), backupPath) || metadata.inventorySha256 !== hashBuffer(inventoryJson) || marker !== metadata.inventorySha256) return false;
    const expectedPaths = new Set([
      FORCE_BACKUP_METADATA_FILE,
      FORCE_BACKUP_INVENTORY_FILE,
      FORCE_BACKUP_COMPLETION_FILE,
      ...inventory.entries.map((entry) => entry.path)
    ]);
    // Refuse additions as well as modifications. An unexpected file could be
    // a planted instruction or payload that a later restore would consume.
    const actualPaths = collectBackupPaths(backupPath);
    if (actualPaths.length !== expectedPaths.size || actualPaths.some((path) => !expectedPaths.has(path))) return false;
    for (const entry of inventory.entries) {
      // Inventory metadata is untrusted; never let completion validation
      // follow an escaped path outside the reserved backup directory.
      assertForceBackupPath(entry.path);
      const path = join(backupPath, entry.path);
      const stat = lstatSync(path);
      if (entry.kind === "symlink") {
        if (!stat.isSymbolicLink() || readlinkSync(path) !== entry.linkTarget) return false;
      } else if (entry.kind === "directory") {
        if (!stat.isDirectory() || modeFor(stat) !== entry.mode) return false;
      } else if (!stat.isFile() || modeFor(stat) !== entry.mode || hashFile(path) !== entry.sha256) return false;
    }
    return true;
  } catch { return false; }
}
