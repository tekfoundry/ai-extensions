import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import { ACTIVE_SKILLS_DIR } from "../paths/agents.js";
import type { FileHash, LockfileSkillEntry } from "../schema.js";
import { packageFileHashes } from "./package-files.js";

function expectedActivationTarget(packagePath: string): string {
  return relative(ACTIVE_SKILLS_DIR, packagePath);
}

export function assertActivationPathAvailable(activationPath: string, packagePath: string): void {
  if (!existsSync(activationPath)) {
    return;
  }

  const stats = lstatSync(activationPath);

  if (!stats.isSymbolicLink()) {
    throw new AixError(`Active skill name collision: ${activationPath}`);
  }

  if (readlinkSync(activationPath) !== expectedActivationTarget(packagePath)) {
    throw new AixError(`Active skill name collision: ${activationPath}`);
  }
}

function rewriteSkillNameFrontMatter(contents: string, activeName: string): string {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match || !/^name:\s*.+$/m.test(match[1])) {
    throw new AixError("Cannot create aliased active skill: SKILL.md must declare a front matter name.");
  }

  return contents.replace(/^name:\s*.+$/m, `name: ${activeName}`);
}

export function activateDirectSymlink(activationPath: string, packagePath: string): FileHash[] {
  assertActivationPathAvailable(activationPath, packagePath);

  if (!existsSync(activationPath)) {
    mkdirSync(dirname(activationPath), { recursive: true });
    symlinkSync(expectedActivationTarget(packagePath), activationPath, "dir");
  }

  return packageFileHashes(packagePath);
}

export function activateAliasWrapper(activationPath: string, packagePath: string, activeName: string): FileHash[] {
  if (existsSync(activationPath)) {
    throw new AixError(`Active skill name collision: ${activationPath}`);
  }

  const activeFiles = copyFilesSafely(packagePath, activationPath);
  const skillFile = join(activationPath, "SKILL.md");

  writeFileSync(skillFile, rewriteSkillNameFrontMatter(readFileSync(skillFile, "utf8"), activeName), "utf8");

  return activeFiles
    .map((file) => ({
      path: file.path,
      sha256: hashFile(join(activationPath, file.path))
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function assertActiveFilesMatchLockfile(entry: LockfileSkillEntry): void {
  if (!existsSync(entry.activationPath)) {
    throw new AixError(`Refusing to remove modified active skill: ${entry.activationPath}`);
  }

  const actualFiles = packageFileHashes(entry.activationPath);
  const actualByPath = new Map(actualFiles.map((file) => [file.path, file.sha256]));
  const expectedPaths = new Set(entry.activeFiles.map((file) => file.path));

  if (actualFiles.some((file) => !expectedPaths.has(file.path))) {
    throw new AixError(`Refusing to remove modified active skill: ${entry.activationPath}`);
  }

  for (const expected of entry.activeFiles) {
    if (actualByPath.get(expected.path) !== expected.sha256) {
      throw new AixError(`Refusing to remove modified active skill: ${entry.activationPath}`);
    }
  }
}

export function removeActivePath(path: string): void {
  const stats = lstatSync(path);

  if (stats.isSymbolicLink()) {
    unlinkSync(path);
    return;
  }

  rmSync(path, { recursive: true });
}
