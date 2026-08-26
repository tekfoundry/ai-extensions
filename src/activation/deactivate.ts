import { parseManifest } from "../manifest.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileSkillEntry } from "../schema.js";
import { assertActiveFilesMatchLockfile, removeActivePath } from "./active-files.js";
import { readJsonObject, writeJsonObjectAtomic } from "./json.js";
import { readLockfileJson, skillsDependingOn } from "./lockfile.js";
import { removeManifestSkill } from "./manifest.js";
import { assertFolderNameSafe } from "./naming.js";
import { assertPackageFilesMatchLockfile, removePackagePath } from "./package-files.js";
import type { DeactivateSkillResult } from "./types.js";
import { AixError } from "../errors.js";

function skillKey(skill: Pick<LockfileSkillEntry, "source" | "sourcePath">): string {
  return `${skill.source}:${skill.sourcePath}`;
}

function reachableSkillKeys(lockfile: { skills: LockfileSkillEntry[] }): Set<string> {
  const entriesByKey = new Map(lockfile.skills.map((skill) => [skillKey(skill), skill]));
  const reachable = new Set<string>();
  const pending = lockfile.skills.filter((skill) => skill.requested).map(skillKey);

  while (pending.length > 0) {
    const key = pending.pop();

    if (!key || reachable.has(key)) {
      continue;
    }

    reachable.add(key);

    for (const dependency of entriesByKey.get(key)?.dependencies || []) {
      pending.push(`${dependency.source}:${dependency.sourcePath}`);
    }
  }

  return reachable;
}

function orphanedDependencyEntries(lockfile: { skills: LockfileSkillEntry[] }): LockfileSkillEntry[] {
  const reachable = reachableSkillKeys(lockfile);

  return lockfile.skills.filter((skill) => !skill.requested && !reachable.has(skillKey(skill)));
}

export function deactivateSkill(activeName: string | undefined): DeactivateSkillResult {
  if (!activeName) {
    throw new AixError("Usage: aix skill deactivate <active-name>");
  }

  assertFolderNameSafe(activeName, "active skill name");

  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifestJson);

  const lockfile = readLockfileJson();
  const entryIndex = lockfile.skills.findIndex((skill) => skill.activeName === activeName);

  if (entryIndex < 0) {
    throw new AixError(`Unknown active skill: ${activeName}`);
  }

  const entry = lockfile.skills[entryIndex];

  if (entry.owner?.kind === "workflow") {
    throw new AixError(
      `Cannot deactivate ${activeName} directly because it is owned by workflow ${entry.owner.name}. Use aix workflow uninstall first.`
    );
  }

  if (entry.owner?.kind === "role") {
    throw new AixError(
      `Cannot deactivate ${activeName} directly because it is owned by role ${entry.owner.name}. Use aix role deactivate ${entry.owner.name} instead.`
    );
  }

  const dependents = skillsDependingOn(lockfile, entry.source, entry.sourcePath)
    .filter((skill) => skill.activeName !== entry.activeName);

  if (!entry.requested && dependents.length > 0) {
    throw new AixError(
      [
        `Cannot deactivate ${activeName} because active skills depend on it:`,
        ...dependents.map((skill) => `- ${skill.activeName}`)
      ].join("\n")
    );
  }

  assertActiveFilesMatchLockfile(entry);
  assertPackageFilesMatchLockfile(entry);

  if (entry.requested) {
    removeManifestSkill(manifestJson, entry.source, entry.sourcePath);
  }

  if (dependents.length > 0) {
    entry.requested = false;
  } else {
    lockfile.skills.splice(entryIndex, 1);
  }

  const orphanedEntries = orphanedDependencyEntries(lockfile);
  const removedEntries = dependents.length > 0 ? orphanedEntries : [entry, ...orphanedEntries];

  for (const removedEntry of orphanedEntries) {
    assertActiveFilesMatchLockfile(removedEntry);
    assertPackageFilesMatchLockfile(removedEntry);
  }

  lockfile.skills = lockfile.skills.filter(
    (skill) => !orphanedEntries.some((orphan) => orphan.source === skill.source && orphan.sourcePath === skill.sourcePath)
  );

  for (const removedEntry of removedEntries) {
    removeActivePath(removedEntry.activationPath);
    removePackagePath(removedEntry.packagePath);
  }

  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    activeName,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    activationPath: entry.activationPath,
    packagePath: entry.packagePath,
    removedActiveSkills: removedEntries.map((removedEntry) => ({
      activeName: removedEntry.activeName,
      activationPath: removedEntry.activationPath
    })),
    removedPackages: removedEntries.map((removedEntry) => ({
      activeName: removedEntry.activeName,
      packagePath: removedEntry.packagePath
    }))
  };
}
