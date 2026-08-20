import { existsSync, readFileSync } from "node:fs";
import { AixError } from "../errors.js";
import { parseLockfile } from "../lockfile.js";
import { LOCKFILE_FILE_NAME, LOCKFILE_VERSION, type LockfileSkillEntry, type SkillsLockfile } from "../schema.js";

export function readLockfileJson(): SkillsLockfile {
  if (!existsSync(LOCKFILE_FILE_NAME)) {
    return {
      lockfileVersion: LOCKFILE_VERSION,
      skills: [],
      workflows: []
    };
  }

  return parseLockfile(JSON.parse(readFileSync(LOCKFILE_FILE_NAME, "utf8")));
}

export function assertNoActiveNameCollision(
  lockfile: { skills: LockfileSkillEntry[] },
  activeName: string,
  source: string,
  sourcePath: string
): void {
  const existing = lockfile.skills.find((skill) => skill.activeName === activeName);

  if (existing && (existing.source !== source || existing.sourcePath !== sourcePath)) {
    throw new AixError(`Active skill name collision: ${activeName}`);
  }
}

export function upsertLockfileEntry(lockfile: { skills: LockfileSkillEntry[] }, entry: LockfileSkillEntry): void {
  const existingIndex = lockfile.skills.findIndex(
    (skill) => skill.source === entry.source && skill.sourcePath === entry.sourcePath
  );

  if (existingIndex >= 0) {
    lockfile.skills[existingIndex] = entry;
  } else {
    lockfile.skills.push(entry);
  }
}

export function skillsDependingOn(
  lockfile: { skills: LockfileSkillEntry[] },
  source: string,
  sourcePath: string
): LockfileSkillEntry[] {
  return lockfile.skills.filter((skill) =>
    skill.dependencies?.some((dependency) => dependency.source === source && dependency.sourcePath === sourcePath)
  );
}
