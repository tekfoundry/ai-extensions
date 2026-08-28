import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import { assertFileHashesMatchLockfile, fileHashesForPath } from "../lockfile/drift.js";
import { roleEntrypointPath, roleGuidancePath } from "../paths/agents.js";
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

export function assertRoleFileHashesMatch(path: string, expectedFiles: FileHash[], message: string): void {
  assertFileHashesMatchLockfile(path, expectedFiles, message);
}

export function assertRolePackageFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertRoleFileHashesMatch(entry.packagePath, entry.packageFiles, `Refusing to ${action} modified role package: ${entry.packagePath}`);
}

export function assertActiveRoleFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  for (const file of entry.activeFiles) {
    const path = join(entry.activationPath, file.path);

    if (!existsSync(path) || hashFile(path) !== file.sha256) {
      throw new AixError(`Refusing to ${action} modified active role: ${entry.activationPath}`);
    }
  }
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
