import { existsSync, lstatSync, readdirSync, rmSync, rmdirSync } from "node:fs";
import { dirname } from "node:path";
import { AixError } from "../errors.js";
import { assertFileHashesMatchLockfile, fileHashesForPath } from "../lockfile/drift.js";
import { SKILL_PACKAGES_DIR } from "../paths/agents.js";
import type { FileHash, LockfileSkillEntry } from "../schema.js";

export function packageFileHashes(packagePath: string): FileHash[] {
  return fileHashesForPath(packagePath);
}

export function assertPackageFilesMatchLockfile(entry: LockfileSkillEntry, action = "remove"): void {
  assertFileHashesMatchLockfile(entry.packagePath, entry.packageFiles, `Refusing to ${action} modified package: ${entry.packagePath}`);
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

  assertFileHashesMatchLockfile(
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
