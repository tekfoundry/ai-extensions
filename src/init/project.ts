import { existsSync, statSync } from "node:fs";
import { AixError } from "../errors.js";
import { AGENTS_DIR } from "../paths/agents.js";
import { activateSkillFromDefinitions } from "../activation/index.js";
import { readJsonObject, writeJsonObjectAtomic } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { MANIFEST_FILE_NAME, LOCKFILE_FILE_NAME } from "../schema.js";
import { defaultCacheRoot, getDefaultSources } from "../sources/index.js";
import { defaultStandaloneSkillTargets } from "./default-skills.js";
import type { InitOptions, InitResult } from "./types.js";

export function initProject(options: InitOptions = {}): InitResult {
  if (existsSync(AGENTS_DIR) && !statSync(AGENTS_DIR).isDirectory()) {
    throw new AixError(`${AGENTS_DIR} exists but is not a directory.`);
  }

  const cacheRoot = options.cacheRoot || defaultCacheRoot();

  const defaultSources = options.sources || getDefaultSources();
  const manifestJson = existsSync(MANIFEST_FILE_NAME)
    ? readJsonObject(MANIFEST_FILE_NAME)
    : {
        sources: { skills: {} },
        skills: []
      };
  manifestJson.sources = {
    ...(typeof manifestJson.sources === "object" && manifestJson.sources !== null ? manifestJson.sources : {}),
    skills: Object.fromEntries(Object.entries(defaultSources).map(([name, definition]) => [name, definition]))
  };
  manifestJson.skills = Array.isArray(manifestJson.skills) ? manifestJson.skills : [];
  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  if (!existsSync(LOCKFILE_FILE_NAME)) {
    writeJsonObjectAtomic(LOCKFILE_FILE_NAME, readLockfileJson());
  }

  const standaloneSkills = defaultStandaloneSkillTargets(defaultSources, cacheRoot);

  for (const target of standaloneSkills) {
    activateSkillFromDefinitions(target, undefined, defaultSources, cacheRoot);
  }

  return {
    declaredCount: 0,
    materializedCount: 0,
    activatedCount: 0,
    standaloneActivatedCount: standaloneSkills.length,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME
  };
}
