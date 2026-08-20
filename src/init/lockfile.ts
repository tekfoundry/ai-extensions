import { join, relative } from "node:path";
import { listFilesRecursively } from "../fs/files.js";
import { hashFile } from "../fs/hashing.js";
import { activeSkillPath, packageSkillPath } from "../paths/agents.js";
import {
  LOCKFILE_VERSION,
  type FileHash,
  type LockfileSkillEntry,
  type SkillsLockfile
} from "../schema.js";
import { parseSkillNameFromDirectory } from "../skills/index.js";
import type { SkillSource } from "./types.js";

function hashSourceFiles(sourcePath: string): FileHash[] {
  return listFilesRecursively(sourcePath)
    .map((sourceFile) => ({
      path: relative(sourcePath, sourceFile),
      sha256: hashFile(sourceFile)
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function createLockEntry(skill: SkillSource): LockfileSkillEntry {
  const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
  const originalName = parseSkillNameFromDirectory(sourcePath);
  const activeName = originalName;
  const packagePath = packageSkillPath(skill.source, skill.sourcePath);
  const activationPath = activeSkillPath(activeName);
  const definition = skill.resolvedSource.definition;
  const files = hashSourceFiles(sourcePath);

  return {
    kind: "skill",
    source: skill.source,
    sourceType: "git",
    sourceUrl: definition.url,
    requestedRef: definition.ref,
    resolvedCommit: skill.resolvedSource.resolvedCommit,
    sourcePath: skill.sourcePath,
    packagePath,
    activationPath,
    originalName,
    activeName,
    requested: true,
    packageFiles: files,
    activeFiles: files
  };
}

export function createLockfile(skillSources: SkillSource[]): SkillsLockfile {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: skillSources.map(createLockEntry)
  };
}
