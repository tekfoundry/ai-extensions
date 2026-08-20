import { existsSync, lstatSync, readdirSync, rmSync, rmdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import { AixError } from "../errors.js";
import { listFilesRecursively } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import { SKILL_PACKAGES_DIR } from "../paths/agents.js";
import type { FileHash, LockfileSkillEntry } from "../schema.js";

export function packageFileHashes(packagePath: string): FileHash[] {
  return listFilesRecursively(packagePath)
    .map((file) => ({
      path: relative(packagePath, file),
      sha256: hashFile(file)
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function assertFileHashesMatch(root: string, expectedFiles: FileHash[], errorMessage: string): void {
  if (!existsSync(root)) {
    throw new AixError(errorMessage);
  }

  const actualFiles = packageFileHashes(root);
  const actualByPath = new Map(actualFiles.map((file) => [file.path, file.sha256]));
  const expectedPaths = new Set(expectedFiles.map((file) => file.path));

  if (actualFiles.some((file) => !expectedPaths.has(file.path))) {
    throw new AixError(errorMessage);
  }

  for (const expected of expectedFiles) {
    if (actualByPath.get(expected.path) !== expected.sha256) {
      throw new AixError(errorMessage);
    }
  }
}

export function assertPackageFilesMatchLockfile(entry: LockfileSkillEntry): void {
  assertFileHashesMatch(entry.packagePath, entry.packageFiles, `Refusing to remove modified package: ${entry.packagePath}`);
}

export function assertPackagePathMatchesSource(
  packagePath: string,
  sourceSkillPath: string,
  source: string,
  sourcePath: string
): void {
  if (!existsSync(packagePath)) {
    return;
  }

  if (!lstatSync(packagePath).isDirectory()) {
    throw new AixError(
      `Refusing to activate ${source}/${sourcePath} because an untracked package directory has local changes: ${packagePath}`
    );
  }

  assertFileHashesMatch(
    packagePath,
    packageFileHashes(sourceSkillPath),
    `Refusing to activate ${source}/${sourcePath} because an untracked package directory has local changes: ${packagePath}`
  );
}

export function removePackagePath(packagePath: string): void {
  rmSync(packagePath, { recursive: true });

  let parentPath = dirname(packagePath);

  while (parentPath !== "." && parentPath !== SKILL_PACKAGES_DIR && parentPath.startsWith(`${SKILL_PACKAGES_DIR}/`)) {
    if (!existsSync(parentPath) || readdirSync(parentPath).length > 0) {
      return;
    }

    rmdirSync(parentPath);
    parentPath = dirname(parentPath);
  }
}
