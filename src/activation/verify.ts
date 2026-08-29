import { existsSync } from "node:fs";
import { addManagedAppendVerifyIssues } from "../agents-md.js";
import { parseManifest } from "../manifest.js";
import { compareFileHashesToLockfile } from "../lockfile/drift.js";
import { activeSkillPath, packageSkillPath } from "../paths/agents.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileSkillEntry, type SkillRequest } from "../schema.js";
import { parseSkillNameFromDirectory } from "../skills.js";
import { readJsonObject } from "./json.js";
import { readLockfileJson } from "./lockfile.js";
import type { VerifySkillsResult } from "./types.js";

function skillKey(skill: Pick<LockfileSkillEntry, "source" | "sourcePath">): string {
  return `${skill.source}:${skill.sourcePath}`;
}

function manifestSkillKey(skill: SkillRequest): string {
  return `${skill.source}:${skill.path}`;
}

function addHashIssues(issues: string[], label: string, root: string, comparison: ReturnType<typeof compareFileHashesToLockfile>): void {
  if (comparison.matches) {
    return;
  }

  if (comparison.missingRoot) {
    issues.push(`${label} is missing: ${root}`);
    return;
  }

  for (const path of comparison.missingFiles) {
    issues.push(`${label} is missing locked file: ${root}/${path}`);
  }

  for (const path of comparison.changedFiles) {
    issues.push(`${label} file hash changed: ${root}/${path}`);
  }

  for (const path of comparison.unexpectedFiles) {
    issues.push(`${label} has unexpected file: ${root}/${path}`);
  }
}

function readSkillName(issues: string[], label: string, path: string): string | undefined {
  try {
    return parseSkillNameFromDirectory(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`${label} has invalid SKILL.md at ${path}: ${message}`);
    return undefined;
  }
}

export function verifySkills(): VerifySkillsResult {
  const manifest = parseManifest(readJsonObject(MANIFEST_FILE_NAME));
  const manifestSkills = manifest.skills as SkillRequest[];
  const lockfile = readLockfileJson();
  const issues: string[] = [];
  const activeNames = new Map<string, LockfileSkillEntry>();
  const lockfileEntriesByKey = new Map(lockfile.skills.map((skill) => [skillKey(skill), skill]));

  for (const skill of lockfile.skills) {
    const existingActiveName = activeNames.get(skill.activeName);

    if (existingActiveName) {
      issues.push(`Active skill name collision in lockfile: ${skill.activeName}`);
    } else {
      activeNames.set(skill.activeName, skill);
    }

    if (!skill.owner && skill.packagePath !== packageSkillPath(skill.source, skill.sourcePath)) {
      issues.push(`Lockfile package path mismatch for ${skill.source}/${skill.sourcePath}: ${skill.packagePath}`);
    }

    if (skill.activationPath !== activeSkillPath(skill.activeName)) {
      issues.push(`Lockfile active path mismatch for ${skill.activeName}: ${skill.activationPath}`);
    }

    if (skill.alias && skill.alias !== skill.activeName) {
      issues.push(`Alias mismatch for ${skill.source}/${skill.sourcePath}: alias ${skill.alias} active ${skill.activeName}`);
    }

    if (!skill.alias && skill.activeName !== skill.originalName) {
      issues.push(`Active name mismatch for ${skill.source}/${skill.sourcePath}: expected ${skill.originalName} got ${skill.activeName}`);
    }

    addHashIssues(issues, "Package", skill.packagePath, compareFileHashesToLockfile(skill.packagePath, skill.packageFiles));
    addHashIssues(issues, "Active skill", skill.activationPath, compareFileHashesToLockfile(skill.activationPath, skill.activeFiles));
    addManagedAppendVerifyIssues(issues, skill.agentsMd);

    if (existsSync(skill.packagePath)) {
      const packageName = readSkillName(issues, "Package", skill.packagePath);

      if (packageName && packageName !== skill.originalName) {
        issues.push(`Package SKILL.md name mismatch for ${skill.source}/${skill.sourcePath}: expected ${skill.originalName} got ${packageName}`);
      }
    }

    if (existsSync(skill.activationPath)) {
      const activeName = readSkillName(issues, "Active skill", skill.activationPath);

      if (activeName && activeName !== skill.activeName) {
        issues.push(`Active SKILL.md name mismatch for ${skill.activeName}: got ${activeName}`);
      }
    }
  }

  for (const skill of manifestSkills) {
    const locked = lockfileEntriesByKey.get(manifestSkillKey(skill));

    if (!locked) {
      issues.push(`Manifest skill is not locked: ${skill.source}/${skill.path}`);
      continue;
    }

    if (!locked.requested) {
      issues.push(`Manifest skill is locked as dependency-only: ${skill.source}/${skill.path}`);
    }

    if (skill.alias && skill.alias !== locked.activeName) {
      issues.push(`Manifest alias mismatch for ${skill.source}/${skill.path}: expected ${skill.alias} got ${locked.activeName}`);
    }
  }

  for (const skill of lockfile.skills) {
    if (skill.requested && !manifestSkills.some((manifestSkill) => manifestSkillKey(manifestSkill) === skillKey(skill))) {
      issues.push(`Requested lockfile skill is missing from manifest: ${skill.source}/${skill.sourcePath}`);
    }
  }

  return { issues };
}
