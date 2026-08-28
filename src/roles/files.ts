import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import { assertFileHashesMatchLockfile, fileHashesForPath } from "../lockfile/drift.js";
import { roleEntrypointPath } from "../paths/agents.js";
import type { FileHash, LockfileRoleEntry } from "../schema.js";

export function roleFileHashes(path: string): FileHash[] {
  return fileHashesForPath(path);
}

export function assertRoleFileHashesMatch(path: string, expectedFiles: FileHash[], message: string): void {
  assertFileHashesMatchLockfile(path, expectedFiles, message);
}

export function assertRolePackageFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertRoleFileHashesMatch(entry.packagePath, entry.packageFiles, `Refusing to ${action} modified role package: ${entry.packagePath}`);
}

export function assertActiveRoleFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertRoleFileHashesMatch(entry.activationPath, entry.activeFiles, `Refusing to ${action} modified active role: ${entry.activationPath}`);
}

export function copyRoleFileSafely(sourcePath: string, targetPath: string): FileHash[] {
  return copyFilesSafely(sourcePath, targetPath);
}

export function replaceRoleDirectory(sourcePath: string, targetPath: string): FileHash[] {
  rmSync(targetPath, { force: true, recursive: true });
  return copyRoleFileSafely(sourcePath, targetPath);
}

export function writeActiveRoleFile(sourcePath: string, targetPath: string, activeName: string): FileHash[] {
  const sourceEntrypointPath = roleEntrypointPath(sourcePath);
  const targetEntrypointPath = roleEntrypointPath(targetPath);
  const contents = readFileSync(sourceEntrypointPath, "utf8");
  const activeContents = contents.replace(/^name:\s*.+$/m, `name: ${activeName}`);

  if (existsSync(targetPath)) {
    if (!lstatSync(targetPath).isDirectory() || !existsSync(targetEntrypointPath)) {
      throw new AixError(`Active role name collision: ${targetPath}`);
    }

    if (readFileSync(targetEntrypointPath, "utf8") !== activeContents) {
      throw new AixError(`Active role name collision: ${targetPath}`);
    }
  }

  mkdirSync(targetPath, { recursive: true });
  writeFileSync(targetEntrypointPath, activeContents, "utf8");

  return roleFileHashes(targetPath);
}

export function replaceActiveRoleFile(sourcePath: string, targetPath: string, activeName: string): FileHash[] {
  removeRoleFile(targetPath);
  return writeActiveRoleFile(sourcePath, targetPath, activeName);
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
