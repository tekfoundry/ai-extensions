import { existsSync } from "node:fs";
import { relative } from "node:path";
import { AixError } from "../errors.js";
import { listFilesRecursively } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import type { FileHash } from "../schema.js";

export interface LockfileHashComparison {
  matches: boolean;
  missingRoot: boolean;
  missingFiles: string[];
  changedFiles: string[];
  unexpectedFiles: string[];
  actualFiles: FileHash[];
}

export function fileHashesForPath(root: string): FileHash[] {
  return listFilesRecursively(root)
    .map((file) => ({
      path: relative(root, file),
      sha256: hashFile(file)
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function compareFileHashesToLockfile(root: string, expectedFiles: FileHash[]): LockfileHashComparison {
  if (!existsSync(root)) {
    return {
      matches: false,
      missingRoot: true,
      missingFiles: expectedFiles.map((file) => file.path),
      changedFiles: [],
      unexpectedFiles: [],
      actualFiles: []
    };
  }

  const actualFiles = fileHashesForPath(root);
  const actualByPath = new Map(actualFiles.map((file) => [file.path, file.sha256]));
  const expectedByPath = new Map(expectedFiles.map((file) => [file.path, file.sha256]));

  const unexpectedFiles = actualFiles.filter((file) => !expectedByPath.has(file.path)).map((file) => file.path);
  const missingFiles = expectedFiles.filter((file) => !actualByPath.has(file.path)).map((file) => file.path);
  const changedFiles = expectedFiles
    .filter((file) => {
      const actualHash = actualByPath.get(file.path);
      return actualHash !== undefined && actualHash !== file.sha256;
    })
    .map((file) => file.path);

  return {
    matches: missingFiles.length === 0 && changedFiles.length === 0 && unexpectedFiles.length === 0,
    missingRoot: false,
    missingFiles,
    changedFiles,
    unexpectedFiles,
    actualFiles
  };
}

export function assertFileHashesMatchLockfile(root: string, expectedFiles: FileHash[], errorMessage: string): void {
  if (!compareFileHashesToLockfile(root, expectedFiles).matches) {
    throw new AixError(errorMessage);
  }
}
