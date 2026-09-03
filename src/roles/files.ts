import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import { assertFileHashesMatchLockfile, fileHashesForPath } from "../lockfile/drift.js";
import { ACTIVE_ROLES_DIR, PACKAGES_DIR, roleEntrypointPath, roleGuidancePath } from "../paths/agents.js";
import type { FileHash, LockfileRoleEntry } from "../schema.js";

export function roleFileHashes(path: string): FileHash[] {
  return fileHashesForPath(path);
}

export function activeRoleFileHashes(path: string): FileHash[] {
  const entrypointPath = roleEntrypointPath(path);

  return existsSync(entrypointPath)
    ? [
        {
          path: "ROLE.md",
          sha256: hashFile(entrypointPath)
        }
      ]
    : [];
}

function companionGuidanceNames(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".GUIDANCE.md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export function assertRoleFileHashesMatch(path: string, expectedFiles: FileHash[], message: string): void {
  assertFileHashesMatchLockfile(path, expectedFiles, message);
}

export function assertRolePackageFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertManagedRoleDeletionPaths(entry);
  assertRoleFileHashesMatch(entry.packagePath, entry.packageFiles, `Refusing to ${action} modified role package: ${entry.packagePath}`);
}

export function assertActiveRoleFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertManagedRoleDeletionPaths(entry);
  for (const file of entry.activeFiles) {
    const path = join(entry.activationPath, file.path);

    if (!existsSync(path) || hashFile(path) !== file.sha256) {
      throw new AixError(`Refusing to ${action} modified active role: ${entry.activationPath}`);
    }
  }
}

function assertManagedDeletionPath(path: string, root: string, label: string): void {
  if (isAbsolute(path) || /^[A-Za-z]:[\\/]/.test(path)) {
    throw new AixError(`Refusing to use ${label} outside the project-managed .agents directory: ${path}`);
  }

  const segments = path.replaceAll("\\", "/").split("/");
  if (segments.includes("..")) {
    throw new AixError(`Refusing to use ${label} with path traversal: ${path}`);
  }

  const projectRoot = process.cwd();
  const rootPath = resolve(projectRoot, root);
  const candidatePath = resolve(projectRoot, path);
  const rootRelative = relative(rootPath, candidatePath);
  if (!rootRelative || rootRelative.startsWith("..") || isAbsolute(rootRelative)) {
    throw new AixError(`Refusing to use ${label} outside ${root}: ${path}`);
  }

  let existingPath = candidatePath;
  while (true) {
    try {
      if (lstatSync(existingPath).isSymbolicLink()) {
        throw new AixError(`Refusing to use symlink-escaped ${label}: ${path}`);
      }
      break;
    } catch (error) {
      if (error instanceof AixError) throw error;
      const parent = dirname(existingPath);
      if (parent === existingPath) break;
      existingPath = parent;
    }
  }

  const realRoot = realpathSync(rootPath);
  const realProjectRoot = realpathSync(projectRoot);
  const rootProjectRelative = relative(realProjectRoot, realRoot);
  if (rootProjectRelative.startsWith("..") || isAbsolute(rootProjectRelative)) {
    throw new AixError(`Refusing to use symlink-escaped managed root for ${label}: ${root}`);
  }
  const realExisting = realpathSync(existingPath);
  const realRelative = relative(realRoot, realExisting);
  if (realRelative.startsWith("..") || isAbsolute(realRelative)) {
    throw new AixError(`Refusing to use symlink-escaped ${label}: ${path}`);
  }

  if (existsSync(candidatePath)) {
    const realCandidate = realpathSync(candidatePath);
    const candidateRelative = relative(realRoot, realCandidate);
    if (candidateRelative.startsWith("..") || isAbsolute(candidateRelative)) {
      throw new AixError(`Refusing to use symlink-escaped ${label}: ${path}`);
    }
  }
}

export function assertManagedRoleDeletionPaths(entry: LockfileRoleEntry): void {
  assertManagedDeletionPath(entry.packagePath, PACKAGES_DIR, "role package path");
  assertManagedDeletionPath(entry.activationPath, ACTIVE_ROLES_DIR, "role activation path");
}

export function copyRoleFileSafely(sourcePath: string, targetPath: string): FileHash[] {
  return copyFilesSafely(sourcePath, targetPath);
}

export function replaceRoleDirectory(sourcePath: string, targetPath: string): FileHash[] {
  rmSync(targetPath, { force: true, recursive: true });
  return copyRoleFileSafely(sourcePath, targetPath);
}

export function writeActiveRoleFile(
  sourcePath: string,
  targetPath: string,
  activeName: string,
  options: { overwriteRole?: boolean } = {}
): FileHash[] {
  const sourceEntrypointPath = roleEntrypointPath(sourcePath);
  const sourceGuidancePath = roleGuidancePath(sourcePath);
  const targetEntrypointPath = roleEntrypointPath(targetPath);
  const targetGuidancePath = roleGuidancePath(targetPath);
  const contents = readFileSync(sourceEntrypointPath, "utf8");
  const activeContents = contents.replace(/^name:\s*.+$/m, `name: ${activeName}`);

  if (existsSync(targetPath)) {
    if (!lstatSync(targetPath).isDirectory() || !existsSync(targetEntrypointPath)) {
      throw new AixError(`Active role name collision: ${targetPath}`);
    }

    if (!options.overwriteRole && readFileSync(targetEntrypointPath, "utf8") !== activeContents) {
      throw new AixError(`Active role name collision: ${targetPath}`);
    }
  }

  mkdirSync(targetPath, { recursive: true });
  writeFileSync(targetEntrypointPath, activeContents, "utf8");

  if (existsSync(sourceGuidancePath) && !existsSync(targetGuidancePath)) {
    writeFileSync(targetGuidancePath, readFileSync(sourceGuidancePath), "utf8");
  }

  for (const name of companionGuidanceNames(sourcePath)) {
    const targetCompanionPath = join(targetPath, name);

    if (!existsSync(targetCompanionPath)) {
      writeFileSync(targetCompanionPath, readFileSync(join(sourcePath, name), "utf8"), "utf8");
    }
  }

  return activeRoleFileHashes(targetPath);
}

function packageGuidanceHash(entry: LockfileRoleEntry): string | undefined {
  return entry.packageFiles.find((file) => file.path === "GUIDANCE.md")?.sha256;
}

function activeGuidanceIsEditableOrMissing(entry: LockfileRoleEntry): boolean {
  const expectedGuidanceHash = packageGuidanceHash(entry);
  const activeGuidancePath = roleGuidancePath(entry.activationPath);

  return !expectedGuidanceHash || !existsSync(activeGuidancePath) || hashFile(activeGuidancePath) === expectedGuidanceHash;
}

function activeCompanionGuidanceIsEditableOrMissing(entry: LockfileRoleEntry, name: string): boolean {
  const expectedGuidanceHash = entry.packageFiles.find((file) => file.path === name)?.sha256;
  const activeGuidancePath = join(entry.activationPath, name);

  return !expectedGuidanceHash || !existsSync(activeGuidancePath) || hashFile(activeGuidancePath) === expectedGuidanceHash;
}

export function replaceActiveRoleFile(
  sourcePath: string,
  targetPath: string,
  activeName: string,
  previousEntry?: LockfileRoleEntry
): FileHash[] {
  const targetEntrypointPath = roleEntrypointPath(targetPath);
  const targetGuidancePath = roleGuidancePath(targetPath);
  const shouldRefreshGuidance = previousEntry ? activeGuidanceIsEditableOrMissing(previousEntry) : !existsSync(targetGuidancePath);

  const activeFiles = writeActiveRoleFile(sourcePath, targetPath, activeName, { overwriteRole: true });

  if (shouldRefreshGuidance && existsSync(roleGuidancePath(sourcePath))) {
    writeFileSync(targetGuidancePath, readFileSync(roleGuidancePath(sourcePath)), "utf8");
  }

  const nextCompanionNames = new Set(companionGuidanceNames(sourcePath));
  const previousCompanionNames = previousEntry
    ? previousEntry.packageFiles.filter((file) => file.path.endsWith(".GUIDANCE.md")).map((file) => file.path)
    : [];

  for (const name of nextCompanionNames) {
    const activeGuidancePath = join(targetPath, name);
    const shouldRefreshCompanion = previousEntry
      ? activeCompanionGuidanceIsEditableOrMissing(previousEntry, name)
      : !existsSync(activeGuidancePath);

    if (shouldRefreshCompanion) {
      writeFileSync(activeGuidancePath, readFileSync(join(sourcePath, name), "utf8"), "utf8");
    }
  }

  for (const name of previousCompanionNames) {
    if (nextCompanionNames.has(name)) {
      continue;
    }

    const activeGuidancePath = join(targetPath, name);
    if (activeCompanionGuidanceIsEditableOrMissing(previousEntry!, name) && existsSync(activeGuidancePath)) {
      unlinkSync(activeGuidancePath);
    }
  }

  return activeFiles;
}

export function removeRoleFile(path: string): void {
  rmSync(path, { force: true, recursive: true });
}

export function removeRolePackageFile(path: string, stopDirectory = ".agents/packages/roles"): void {
  removeRoleFile(path);

  let current = dirname(path);
  while (relative(stopDirectory, current) && !relative(stopDirectory, current).startsWith("..")) {
    try {
      rmdirSync(current);
    } catch {
      break;
    }

    current = dirname(current);
  }
}
