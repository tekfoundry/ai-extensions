import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { AixError } from "../errors.js";
import { assertInstalledAppendBlockUnmodified, type AppendBlockDefinition } from "../agents-md.js";
import { writeJsonObjectAtomic } from "../activation/json.js";
import { readJsonObject } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { manifestRoleSourceDefinitions, removeManifestRole, updateManifestRoles } from "../activation/manifest.js";
import { extensionAppendDefinition, lockfileBlockForDefinition, preflightAppendDefinitions, writeExtensionAppendBlocks } from "../extension-append.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileRoleEntry, type SourceDefinition, type SourceType } from "../schema.js";
import { defaultCacheRoot, getDefaultRoleSources, loadRoleSourceDefinitions, resolveSourceFromDefinitions } from "../sources/index.js";
import { activeRolePath, packageRolePath, roleEntrypointPath, roleGuidancePath } from "../paths/agents.js";
import { assertFileHashesMatchLockfile } from "../lockfile/drift.js";
import { assertNoActiveRoleNameCollision } from "./lockfile.js";
import { assertBundledRoleGuidance, discoverRoles, parseRoleFileFromPath } from "./discovery.js";
import {
  assertActiveRoleFilesMatchLockfile,
  assertRolePackageFilesMatchLockfile,
  copyRoleFileSafely,
  replaceActiveRoleFile,
  replaceRoleDirectory,
  removeRoleFile,
  removeRolePackageFile,
  roleFileHashes,
  writeActiveRoleFile
} from "./files.js";
import { assertRoleName } from "./validation.js";

export interface RoleActivationResult {
  source: string;
  sourcePath: string;
  originalName: string;
  activeName: string;
  manifestPath: string;
  lockfilePath: string;
  packagePath: string;
  activationPath: string;
}

export interface DeactivateRoleResult {
  activeName: string;
  manifestPath: string;
  lockfilePath: string;
  activationPath: string;
  packagePath: string;
}

export interface UpdatedRole {
  source: string;
  sourcePath: string;
  activeName: string;
  previousResolvedCommit?: string;
  resolvedCommit?: string;
  packagePath: string;
  activationPath: string;
}

export interface UpdateRolesResult {
  lockfilePath: string;
  updatedRoles: UpdatedRole[];
}

export interface RoleDiff {
  source: string;
  sourcePath: string;
  activeName: string;
  packagePath: string;
  sourceRolePath: string;
  diff: string;
}

export interface DiffRolesResult {
  lockfilePath: string;
  diffs: RoleDiff[];
}

export interface ResetRoleGuidanceResult {
  activeName: string;
  packageGuidancePath: string;
  activeGuidancePath: string;
}

export function roleTargetFromInput(target: string): { source: string; sourcePath: string } {
  const separatorIndex = target.indexOf("/");

  if (separatorIndex <= 0 || separatorIndex === target.length - 1) {
    throw new AixError("Usage: aix role activate <source/path-or-role-name> [alias]");
  }

  const source = target.slice(0, separatorIndex);
  let sourcePath = target.slice(separatorIndex + 1);

  sourcePath = normalizeRoleSourcePath(sourcePath);

  return { source, sourcePath };
}

function normalizeRoleSourcePath(sourcePath: string): string {
  return sourcePath.endsWith("/ROLE.md") ? dirname(sourcePath) : sourcePath.replace(/\.md$/, "");
}

export function discoverRolePack(root: string) {
  return discoverRoles(root);
}

function roleLockfileEntry(
  source: string,
  definition: SourceDefinition,
  sourceType: SourceType,
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
  const appendDefinition = extensionAppendDefinition("role", activeName, source, sourcePath, packagePath);
  const agentsMd = lockfileBlockForDefinition(appendDefinition);

  return {
    kind: "role",
    source,
    sourceType,
    ...(sourceType === "git" ? { sourceUrl: definition.url } : {}),
    ...(sourceType === "git" && definition.ref ? { requestedRef: definition.ref } : {}),
    ...(sourceType === "git" && resolvedCommit ? { resolvedCommit } : {}),
    sourcePath,
    packagePath,
    activationPath,
    originalName,
    activeName,
    requested,
    ...(activeName !== originalName ? { alias: activeName } : {}),
    ...(agentsMd ? { agentsMd } : {}),
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

  if (existsSync(packagePath) && !lstatSync(packagePath).isDirectory()) {
    throw new AixError(
      `Refusing to activate ${source}/${sourcePath} because an untracked role package has local changes: ${packagePath}`
    );
  }

  if (existsSync(packagePath)) {
    assertFileHashesMatchLockfile(
      packagePath,
      roleFileHashes(sourceRolePath),
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
  cacheRoot = defaultCacheRoot(),
  resolvedSource?: {
    definition: SourceDefinition;
    sourceType: SourceType;
    sourcePath: string;
    sourceRolePath: string;
    resolvedCommit?: string;
  }
): RoleActivationResult {
  const { source, sourcePath } = roleTargetFromInput(target);
  const manifestJson = existsSync(MANIFEST_FILE_NAME)
    ? readJsonObject(MANIFEST_FILE_NAME)
    : { sources: { skills: {}, roles: {}, workflows: {} }, skills: [], roles: [] };
  const definitions = {
    ...sourceDefinitions,
    ...manifestRoleSourceDefinitions(manifestJson)
  };
  const localPath = resolvedSource ? false : localAixRolePath(source, sourcePath);
  const definition = localPath
    ? {
        type: "git" as const,
        url: ".",
        path: "aix"
      }
    : definitions[source];

  if (!definition) {
    throw new AixError(`Unknown role source: ${source}`);
  }

  if (alias) {
    assertRoleName(alias, "role alias");
  }

  const resolved = resolvedSource
    ? {
        name: source,
        definition: resolvedSource.definition,
        rootPath: dirname(resolvedSource.sourceRolePath),
        resolvedCommit: resolvedSource.resolvedCommit
      }
    : localPath
    ? {
        name: source,
        definition,
        rootPath: "aix",
        resolvedCommit: undefined
      }
    : resolveSourceFromDefinitions(source, definitions, cacheRoot);
  const resolvedSourcePath = resolvedSource?.sourcePath || (localPath ? sourcePath : remoteAixRolePath(source, sourcePath));
  const sourceRolePath = resolvedSource?.sourceRolePath || join(resolved.rootPath, resolvedSourcePath);
  const role = parseRoleFileFromPath(roleEntrypointPath(sourceRolePath), { requireContract: true });

  if (source === "aix") {
    assertBundledRoleGuidance(sourceRolePath);
  }

  const activeName = alias || role.name;
  const expectedFileName = basename(resolvedSourcePath);

  if (role.name !== expectedFileName) {
    throw new AixError(`Invalid role source: ${source}/${resolvedSourcePath} name ${role.name} must match source filename ${expectedFileName}.`);
  }

  assertRoleName(activeName, "active role name");

  const lockfile = readLockfileJson();
  const previousLockfile = structuredClone(lockfile);
  assertRoleActivationSafe(lockfile, source, resolvedSourcePath, sourceRolePath, activeName);
  const sourceAppendDefinition = extensionAppendDefinition("role", activeName, source, resolvedSourcePath, sourceRolePath);

  preflightAppendDefinitions(previousLockfile, [sourceAppendDefinition]);

  const entry = roleLockfileEntry(
    source,
    definition,
    resolvedSource?.sourceType || (localPath ? "local" : "git"),
    resolvedSourcePath,
    sourceRolePath,
    resolved.resolvedCommit,
    activeName,
    role.name,
    true
  );

  upsertRoleEntry(lockfile, entry);
  updateManifestRoles(manifestJson, source, resolvedSourcePath, alias);
  writeExtensionAppendBlocks(previousLockfile, lockfile, sourceAppendDefinition ? [sourceAppendDefinition] : []);
  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    source,
    sourcePath: resolvedSourcePath,
    originalName: role.name,
    activeName,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    packagePath: entry.packagePath,
    activationPath: entry.activationPath
  };
}

function localAixRolePath(source: string, sourcePath: string): string | undefined {
  if (source !== "aix" || !sourcePath.startsWith("roles/")) {
    return undefined;
  }

  const path = join("aix", sourcePath);

  return existsSync(path) ? path : undefined;
}

function remoteAixRolePath(source: string, sourcePath: string): string {
  if (source === "aix" && sourcePath.startsWith("roles/")) {
    return sourcePath.slice("roles/".length);
  }

  return sourcePath;
}

function roleEntryKey(entry: Pick<LockfileRoleEntry, "source" | "sourcePath">): string {
  return `${entry.source}:${entry.sourcePath}`;
}

function roleTargetFromActiveName(target?: string): { source: string; sourcePath: string } | undefined {
  if (!target) {
    return undefined;
  }

  if (target.includes("/")) {
    return roleTargetFromInput(target);
  }

  assertRoleName(target, "active role name");
  const lockfile = readLockfileJson();
  const entry = (lockfile.roles || []).find((role) => role.activeName === target);

  if (!entry) {
    throw new AixError(`Unknown active role: ${target}`);
  }

  return {
    source: entry.source,
    sourcePath: entry.sourcePath
  };
}

function assertRoleNoLocalDrift(entry: LockfileRoleEntry, action: string): void {
  assertRolePackageFilesMatchLockfile(entry, action);
  assertActiveRoleFilesMatchLockfile(entry, action);
}

function localRoleSourcePath(entry: LockfileRoleEntry): string {
  const sourcePath = entry.source === "aix" ? join("aix", entry.sourcePath) : entry.sourcePath;

  if (!existsSync(sourcePath)) {
    throw new AixError(`Local role source is missing: ${sourcePath}`);
  }

  return sourcePath;
}

function gitNoIndexDiff(fromPath: string, toPath: string): string {
  try {
    return execFileSync("git", ["diff", "--no-index", "--", fromPath, toPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 1 && "stdout" in error) {
      return String(error.stdout);
    }

    const message = error instanceof Error ? error.message : String(error);

    throw new AixError(`Git diff failed for ${fromPath} and ${toPath}.\n${message}`);
  }
}

function sourcePathForRole(entry: LockfileRoleEntry, resolvedSources: Map<string, ReturnType<typeof resolveSourceFromDefinitions>>): string {
  if (entry.sourceType === "local") {
    return localRoleSourcePath(entry);
  }

  const resolvedSource = resolvedSources.get(entry.source);

  if (!resolvedSource) {
    throw new AixError(`Unknown role source: ${entry.source}`);
  }

  return join(resolvedSource.rootPath, entry.source === "aix" && entry.sourcePath.startsWith("roles/")
    ? entry.sourcePath.slice("roles/".length)
    : entry.sourcePath);
}

function standaloneRoleEntries(target?: string, cacheRoot = defaultCacheRoot()): {
  entries: LockfileRoleEntry[];
  resolvedSources: Map<string, ReturnType<typeof resolveSourceFromDefinitions>>;
} {
  const lockfile = readLockfileJson();
  const requestedTarget = roleTargetFromActiveName(target);
  const entries = requestedTarget
    ? (lockfile.roles || []).filter((role) => role.source === requestedTarget.source && role.sourcePath === requestedTarget.sourcePath)
    : (lockfile.roles || []).filter((role) => !role.owner);

  if (requestedTarget && entries.length === 0) {
    throw new AixError(`Unknown locked role: ${requestedTarget.source}/${requestedTarget.sourcePath}`);
  }

  if (entries.some((role) => role.owner?.kind === "workflow")) {
    throw new AixError(`Cannot manage workflow-owned role directly: ${entries[0].source}/${entries[0].sourcePath}`);
  }

  const gitEntries = entries.filter((entry) => entry.sourceType !== "local");
  const sourceDefinitions = loadRoleSourceDefinitions();
  const resolvedSources = new Map<string, ReturnType<typeof resolveSourceFromDefinitions>>();

  for (const entry of gitEntries) {
    if (!sourceDefinitions[entry.source]) {
      throw new AixError(`Unknown role source: ${entry.source}`);
    }

    if (!resolvedSources.has(entry.source)) {
      resolvedSources.set(entry.source, resolveSourceFromDefinitions(entry.source, sourceDefinitions, cacheRoot));
    }
  }

  return { entries, resolvedSources };
}

export function diffRoles(target?: string, cacheRoot = defaultCacheRoot()): DiffRolesResult {
  if (existsSync(MANIFEST_FILE_NAME)) {
    readJsonObject(MANIFEST_FILE_NAME);
  }

  const { entries, resolvedSources } = standaloneRoleEntries(target, cacheRoot);

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    diffs: entries
      .map((entry) => {
        const sourceRolePath = sourcePathForRole(entry, resolvedSources);

        return {
          source: entry.source,
          sourcePath: entry.sourcePath,
          activeName: entry.activeName,
          packagePath: entry.packagePath,
          sourceRolePath,
          diff: gitNoIndexDiff(entry.packagePath, sourceRolePath)
        };
      })
      .filter((item) => item.diff.trim() !== "")
  };
}

export function updateRoles(target?: string, cacheRoot = defaultCacheRoot()): UpdateRolesResult {
  const lockfile = readLockfileJson();
  const previousLockfile = structuredClone(lockfile);
  const { entries, resolvedSources } = standaloneRoleEntries(target, cacheRoot);

  if (entries.length === 0) {
    return {
      lockfilePath: LOCKFILE_FILE_NAME,
      updatedRoles: []
    };
  }

  for (const entry of entries) {
    assertRoleNoLocalDrift(entry, "update");
    assertInstalledAppendBlockUnmodified(entry.agentsMd);
  }

  const updatePlans = entries.map((entry) => {
    const sourceRolePath = sourcePathForRole(entry, resolvedSources);
    const role = parseRoleFileFromPath(roleEntrypointPath(sourceRolePath), { requireContract: true });

    return {
      entry,
      sourceRolePath,
      role,
      resolvedSource: resolvedSources.get(entry.source)
    };
  });
  const plansByKey = new Map(updatePlans.map((plan) => [roleEntryKey(plan.entry), plan]));
  const updatedRoles: UpdatedRole[] = [];
  const sourceAppendDefinitions = updatePlans.map((plan) =>
    extensionAppendDefinition("role", plan.entry.activeName, plan.entry.source, plan.entry.sourcePath, plan.sourceRolePath)
  );
  const appendDefinitions: AppendBlockDefinition[] = [];

  preflightAppendDefinitions(previousLockfile, sourceAppendDefinitions);

  lockfile.roles = (lockfile.roles || []).map((entry) => {
    const plan = plansByKey.get(roleEntryKey(entry));

    if (!plan) {
      return entry;
    }

    const packageFiles = replaceRoleDirectory(plan.sourceRolePath, entry.packagePath);
    const activeFiles = replaceActiveRoleFile(entry.packagePath, entry.activationPath, entry.activeName, entry);
    const appendDefinition = extensionAppendDefinition("role", entry.activeName, entry.source, entry.sourcePath, entry.packagePath);
    const agentsMd = lockfileBlockForDefinition(appendDefinition);
    const updatedEntry: LockfileRoleEntry = {
      ...entry,
      ...(entry.sourceType === "git" && plan.resolvedSource
        ? {
            sourceUrl: plan.resolvedSource.definition.url,
            requestedRef: plan.resolvedSource.definition.ref,
            resolvedCommit: plan.resolvedSource.resolvedCommit
          }
        : {}),
      originalName: plan.role.name,
      ...(agentsMd ? { agentsMd } : { agentsMd: undefined }),
      packageFiles,
      activeFiles
    };

    if (appendDefinition) {
      appendDefinitions.push(appendDefinition);
    }

    updatedRoles.push({
      source: updatedEntry.source,
      sourcePath: updatedEntry.sourcePath,
      activeName: updatedEntry.activeName,
      previousResolvedCommit: entry.resolvedCommit,
      resolvedCommit: updatedEntry.resolvedCommit,
      packagePath: updatedEntry.packagePath,
      activationPath: updatedEntry.activationPath
    });

    return updatedEntry;
  });

  writeExtensionAppendBlocks(previousLockfile, lockfile, appendDefinitions);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    updatedRoles
  };
}

export function resetRoleGuidance(activeName: string | undefined): ResetRoleGuidanceResult {
  if (!activeName) {
    throw new AixError("Usage: aix role guidance reset <active-name>");
  }

  assertRoleName(activeName, "active role name");

  const lockfile = readLockfileJson();
  const entry = (lockfile.roles || []).find((role) => role.activeName === activeName);

  if (!entry) {
    throw new AixError(`Unknown active role: ${activeName}`);
  }

  const packageGuidancePath = roleGuidancePath(entry.packagePath);
  const activeGuidancePath = roleGuidancePath(entry.activationPath);

  if (!existsSync(packageGuidancePath)) {
    throw new AixError(`Role guidance is not available for ${activeName}: ${packageGuidancePath}`);
  }

  mkdirSync(entry.activationPath, { recursive: true });
  copyFileSync(packageGuidancePath, activeGuidancePath);

  return {
    activeName,
    packageGuidancePath,
    activeGuidancePath
  };
}

export function deactivateRole(activeName: string | undefined): DeactivateRoleResult {
  if (!activeName) {
    throw new AixError("Usage: aix role deactivate <active-name>");
  }

  assertRoleName(activeName, "active role name");

  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  const lockfile = readLockfileJson();
  const previousLockfile = structuredClone(lockfile);
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
  removeManifestRole(manifestJson, entry.source, entry.sourcePath);

  writeExtensionAppendBlocks(previousLockfile, lockfile, []);

  removeRoleFile(entry.activationPath);
  removeRolePackageFile(entry.packagePath);
  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    activeName,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    activationPath: entry.activationPath,
    packagePath: entry.packagePath
  };
}
