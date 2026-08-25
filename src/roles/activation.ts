import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { AixError } from "../errors.js";
import { writeJsonObjectAtomic } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { LOCKFILE_FILE_NAME, type LockfileRoleEntry, type SourceDefinition } from "../schema.js";
import { defaultCacheRoot, getDefaultRoleSources, resolveSourceFromDefinitions } from "../sources/index.js";
import { activeRolePath, packageRolePath } from "../paths/agents.js";
import { assertNoActiveRoleNameCollision } from "./lockfile.js";
import { discoverRoles, parseRoleFileFromPath } from "./discovery.js";
import {
  assertActiveRoleFilesMatchLockfile,
  assertRolePackageFilesMatchLockfile,
  copyRoleFileSafely,
  removeRoleFile,
  roleFileHashes,
  writeActiveRoleFile
} from "./files.js";
import { assertRoleName } from "./validation.js";

export interface RoleActivationResult {
  source: string;
  sourcePath: string;
  originalName: string;
  activeName: string;
  lockfilePath: string;
  packagePath: string;
  activationPath: string;
}

export interface DeactivateRoleResult {
  activeName: string;
  lockfilePath: string;
  activationPath: string;
  packagePath: string;
}

export function roleTargetFromInput(target: string): { source: string; sourcePath: string } {
  const separatorIndex = target.indexOf("/");

  if (separatorIndex <= 0 || separatorIndex === target.length - 1) {
    throw new AixError("Usage: aix role activate <source/path-or-role-name> [alias]");
  }

  const source = target.slice(0, separatorIndex);
  let sourcePath = target.slice(separatorIndex + 1);

  if (!sourcePath.endsWith(".md")) {
    sourcePath = `${sourcePath}.md`;
  }

  return { source, sourcePath };
}

export function discoverRolePack(root: string) {
  return discoverRoles(root);
}

function roleLockfileEntry(
  source: string,
  definition: SourceDefinition,
  sourcePath: string,
  sourceRolePath: string,
  resolvedCommit: string | undefined,
  activeName: string,
  originalName: string,
  requested: boolean
): LockfileRoleEntry {
  const packagePath = packageRolePath(source, sourcePath);
  const activationPath = activeRolePath(activeName);
  const packageFiles = copyRoleFileSafely(sourceRolePath, packagePath);
  const activeFiles = writeActiveRoleFile(packagePath, activationPath, activeName);

  return {
    kind: "role",
    source,
    sourceType: "git",
    sourceUrl: definition.url,
    requestedRef: definition.ref,
    resolvedCommit,
    sourcePath,
    packagePath,
    activationPath,
    originalName,
    activeName,
    requested,
    ...(activeName !== originalName ? { alias: activeName } : {}),
    packageFiles,
    activeFiles
  };
}

function assertRoleActivationSafe(
  lockfile: { roles?: LockfileRoleEntry[] },
  source: string,
  sourcePath: string,
  sourceRolePath: string,
  activeName: string
): void {
  const existingRole = (lockfile.roles || []).find((role) => role.source === source && role.sourcePath === sourcePath);
  const packagePath = packageRolePath(source, sourcePath);
  const activationPath = activeRolePath(activeName);

  assertNoActiveRoleNameCollision(lockfile, activeName, source, sourcePath);

  if (existingRole) {
    assertRolePackageFilesMatchLockfile(existingRole, "refresh");
    assertActiveRoleFilesMatchLockfile(existingRole, "refresh");
    return;
  }

  if (existsSync(activationPath)) {
    throw new AixError(`Active role name collision: ${activationPath}`);
  }

  if (existsSync(packagePath) && !readFileSync(packagePath).equals(readFileSync(sourceRolePath))) {
    throw new AixError(
      `Refusing to activate ${source}/${sourcePath} because an untracked role package has local changes: ${packagePath}`
    );
  }
}

function upsertRoleEntry(lockfile: { roles?: LockfileRoleEntry[] }, entry: LockfileRoleEntry): void {
  const roles = lockfile.roles || [];
  const existingIndex = roles.findIndex((role) => role.source === entry.source && role.sourcePath === entry.sourcePath);

  if (existingIndex >= 0) {
    roles[existingIndex] = entry;
  } else {
    roles.push(entry);
  }

  lockfile.roles = roles;
}

export function activateRoleFromDefinitions(
  target: string,
  alias: string | undefined,
  sourceDefinitions: Record<string, SourceDefinition> = getDefaultRoleSources(),
  cacheRoot = defaultCacheRoot()
): RoleActivationResult {
  const { source, sourcePath } = roleTargetFromInput(target);
  const definition = sourceDefinitions[source];

  if (!definition) {
    throw new AixError(`Unknown role source: ${source}`);
  }

  if (alias) {
    assertRoleName(alias, "role alias");
  }

  const resolved = resolveSourceFromDefinitions(source, sourceDefinitions, cacheRoot);
  const sourceRolePath = join(resolved.rootPath, sourcePath);
  const role = parseRoleFileFromPath(sourceRolePath, { requireContract: true });
  const activeName = alias || role.name;
  const expectedFileName = basename(sourcePath, ".md");

  if (role.name !== expectedFileName) {
    throw new AixError(`Invalid role source: ${source}/${sourcePath} name ${role.name} must match source filename ${expectedFileName}.`);
  }

  assertRoleName(activeName, "active role name");

  const lockfile = readLockfileJson();
  assertRoleActivationSafe(lockfile, source, sourcePath, sourceRolePath, activeName);

  const entry = roleLockfileEntry(
    source,
    definition,
    sourcePath,
    sourceRolePath,
    resolved.resolvedCommit,
    activeName,
    role.name,
    true
  );

  upsertRoleEntry(lockfile, entry);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    source,
    sourcePath,
    originalName: role.name,
    activeName,
    lockfilePath: LOCKFILE_FILE_NAME,
    packagePath: entry.packagePath,
    activationPath: entry.activationPath
  };
}

export function deactivateRole(activeName: string | undefined): DeactivateRoleResult {
  if (!activeName) {
    throw new AixError("Usage: aix role deactivate <active-name>");
  }

  assertRoleName(activeName, "active role name");

  const lockfile = readLockfileJson();
  const roles = lockfile.roles || [];
  const entryIndex = roles.findIndex((role) => role.activeName === activeName);

  if (entryIndex < 0) {
    throw new AixError(`Unknown active role: ${activeName}`);
  }

  const entry = roles[entryIndex];

  if (entry.owner?.kind === "workflow") {
    throw new AixError(
      `Cannot deactivate ${activeName} directly because it is owned by workflow ${entry.owner.name}. Use aix workflow uninstall first.`
    );
  }

  assertActiveRoleFilesMatchLockfile(entry);
  assertRolePackageFilesMatchLockfile(entry);

  roles.splice(entryIndex, 1);
  lockfile.roles = roles;

  removeRoleFile(entry.activationPath);
  removeRoleFile(entry.packagePath);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    activeName,
    lockfilePath: LOCKFILE_FILE_NAME,
    activationPath: entry.activationPath,
    packagePath: entry.packagePath
  };
}
