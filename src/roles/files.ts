import { existsSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { AixError } from "../errors.js";
import { hashFile } from "../fs/hashing.js";
import type { FileHash, LockfileRoleEntry } from "../schema.js";

export function roleFileHashes(path: string): FileHash[] {
  return [
    {
      path: basename(path),
      sha256: hashFile(path)
    }
  ];
}

export function assertRoleFileHashesMatch(path: string, expectedFiles: FileHash[], message: string): void {
  if (!existsSync(path)) {
    throw new AixError(message);
  }

  const actual = roleFileHashes(path);
  const actualHash = actual[0];
  const expectedHash = expectedFiles.find((file) => file.path === actualHash.path);

  if (!expectedHash || expectedHash.sha256 !== actualHash.sha256 || expectedFiles.length !== 1) {
    throw new AixError(message);
  }
}

export function assertRolePackageFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertRoleFileHashesMatch(entry.packagePath, entry.packageFiles, `Refusing to ${action} modified role package: ${entry.packagePath}`);
}

export function assertActiveRoleFilesMatchLockfile(entry: LockfileRoleEntry, action = "remove"): void {
  assertRoleFileHashesMatch(entry.activationPath, entry.activeFiles, `Refusing to ${action} modified active role: ${entry.activationPath}`);
}

export function copyRoleFileSafely(sourcePath: string, targetPath: string): FileHash[] {
  const contents = readFileSync(sourcePath);

  if (existsSync(targetPath) && !readFileSync(targetPath).equals(contents)) {
    throw new AixError(`Refusing to overwrite local edit: ${targetPath}`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents);

  return roleFileHashes(targetPath);
}

export function writeActiveRoleFile(sourcePath: string, targetPath: string, activeName: string): FileHash[] {
  const contents = readFileSync(sourcePath, "utf8");
  const activeContents = contents.replace(/^name:\s*.+$/m, `name: ${activeName}`);

  if (existsSync(targetPath) && readFileSync(targetPath, "utf8") !== activeContents) {
    throw new AixError(`Active role name collision: ${targetPath}`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, activeContents, "utf8");

  return roleFileHashes(targetPath);
}

export function removeRoleFile(path: string): void {
  rmSync(path, { force: true });
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
