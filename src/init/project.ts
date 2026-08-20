import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely, listFilesRecursively } from "../fs/files.js";
import { assertJsonWriteSafe, writeJsonAtomic } from "../fs/json.js";
import {
  ACTIVE_SKILLS_DIR,
  AGENTS_DIR,
  PACKAGES_DIR,
  SKILL_PACKAGES_DIR,
  activeSkillPath,
  packageSkillPath
} from "../paths/agents.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME } from "../schema.js";
import { defaultCacheRoot, getDefaultSources } from "../sources/index.js";
import { parseSkillNameFromDirectory } from "../skills/index.js";
import { activateSkillSafely, assertActivationSafe } from "./activation.js";
import { buildSkillSources, resolveDefaultSources } from "./default-skills.js";
import { createLockfile } from "./lockfile.js";
import { createManifest } from "./manifest.js";
import type { InitOptions, InitResult, SkillSource } from "./types.js";

function assertNoDefaultActiveNameCollisions(skillSources: SkillSource[]): void {
  const activeNames = new Map<string, string>();

  for (const skill of skillSources) {
    const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
    const activeName = parseSkillNameFromDirectory(sourcePath);
    const existingPath = activeNames.get(activeName);

    if (existingPath) {
      throw new AixError(`Active skill name collision: ${activeName} from ${existingPath} and ${skill.source}:${skill.sourcePath}`);
    }

    activeNames.set(activeName, `${skill.source}:${skill.sourcePath}`);
  }
}

function assertPackageCopiesSafe(skillSources: SkillSource[]): void {
  for (const skill of skillSources) {
    const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
    const targetPath = packageSkillPath(skill.source, skill.sourcePath);

    for (const sourceFile of listFilesRecursively(sourcePath)) {
      const targetFile = join(targetPath, relative(sourcePath, sourceFile));

      if (existsSync(targetFile) && !readFileSync(targetFile).equals(readFileSync(sourceFile))) {
        throw new AixError(`Refusing to overwrite local edit: ${targetFile}`);
      }
    }
  }
}

function assertActiveSkillLinksSafe(skillSources: SkillSource[]): void {
  for (const skill of skillSources) {
    const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
    const activeName = parseSkillNameFromDirectory(sourcePath);

    assertActivationSafe(activeSkillPath(activeName), packageSkillPath(skill.source, skill.sourcePath));
  }
}

export function initProject(options: InitOptions = {}): InitResult {
  if (existsSync(AGENTS_DIR) && !statSync(AGENTS_DIR).isDirectory()) {
    throw new AixError(`${AGENTS_DIR} exists but is not a directory.`);
  }

  const sources = options.sources || getDefaultSources();
  const cacheRoot = options.cacheRoot || defaultCacheRoot();
  const resolvedSources = resolveDefaultSources(sources, cacheRoot);
  const skillSources = buildSkillSources(resolvedSources);
  const manifest = createManifest(skillSources, sources);
  const lockfile = createLockfile(skillSources);
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const lockfileJson = `${JSON.stringify(lockfile, null, 2)}\n`;

  assertJsonWriteSafe(MANIFEST_FILE_NAME, manifestJson);
  assertJsonWriteSafe(LOCKFILE_FILE_NAME, lockfileJson);
  assertNoDefaultActiveNameCollisions(skillSources);
  assertPackageCopiesSafe(skillSources);
  assertActiveSkillLinksSafe(skillSources);

  mkdirSync(PACKAGES_DIR, { recursive: true });
  mkdirSync(SKILL_PACKAGES_DIR, { recursive: true });
  mkdirSync(ACTIVE_SKILLS_DIR, { recursive: true });

  for (const skill of skillSources) {
    const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
    const packagePath = packageSkillPath(skill.source, skill.sourcePath);
    const activeName = parseSkillNameFromDirectory(sourcePath);

    copyFilesSafely(sourcePath, packagePath);
    activateSkillSafely(activeSkillPath(activeName), packagePath);
  }

  writeJsonAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonAtomic(LOCKFILE_FILE_NAME, lockfileJson);

  return {
    declaredCount: skillSources.length,
    materializedCount: lockfile.skills.length,
    activatedCount: lockfile.skills.length,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME
  };
}
