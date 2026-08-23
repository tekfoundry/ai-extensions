import { existsSync, statSync } from "node:fs";
import { AixError } from "../errors.js";
import { AGENTS_DIR } from "../paths/agents.js";
import { activateSkillFromDefinitions } from "../activation/index.js";
import { defaultCacheRoot, getDefaultSources, getDefaultWorkflowSources } from "../sources/index.js";
import { installWorkflowFromDefinitions } from "../workflows/index.js";
import { defaultStandaloneSkillTargets } from "./default-skills.js";
import type { InitOptions, InitResult } from "./types.js";

export function initProject(options: InitOptions = {}): InitResult {
  if (existsSync(AGENTS_DIR) && !statSync(AGENTS_DIR).isDirectory()) {
    throw new AixError(`${AGENTS_DIR} exists but is not a directory.`);
  }

  const cacheRoot = options.cacheRoot || defaultCacheRoot();

  const workflow = installWorkflowFromDefinitions(options.workflowSources || getDefaultWorkflowSources(), cacheRoot, {
    allowExistingWorkflow: true
  });
  const defaultSources = options.sources || getDefaultSources();
  const standaloneSkills = defaultStandaloneSkillTargets(defaultSources, cacheRoot);

  for (const target of standaloneSkills) {
    activateSkillFromDefinitions(target, undefined, defaultSources, cacheRoot);
  }

  return {
    declaredCount: 1,
    materializedCount: workflow.installedDocs.length + workflow.installedTemplates + workflow.activatedSkills.length,
    activatedCount: workflow.activatedSkills.length,
    standaloneActivatedCount: standaloneSkills.length,
    manifestPath: workflow.manifestPath,
    lockfilePath: workflow.lockfilePath
  };
}
