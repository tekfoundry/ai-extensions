import { existsSync, statSync } from "node:fs";
import { AixError } from "../errors.js";
import { activateSkillFromDefinitions } from "../activation/activate.js";
import { AGENTS_DIR } from "../paths/agents.js";
import { defaultCacheRoot, getDefaultSources, getDefaultWorkflowSources } from "../sources/index.js";
import { installWorkflowFromDefinitions } from "../workflows/index.js";
import type { InitOptions, InitResult } from "./types.js";

const DEFAULT_STANDALONE_SKILLS = ["aix/code-review-refactor"];

export function initProject(options: InitOptions = {}): InitResult {
  if (existsSync(AGENTS_DIR) && !statSync(AGENTS_DIR).isDirectory()) {
    throw new AixError(`${AGENTS_DIR} exists but is not a directory.`);
  }

  const cacheRoot = options.cacheRoot || defaultCacheRoot();
  const workflow = installWorkflowFromDefinitions(options.workflowSources || getDefaultWorkflowSources(), cacheRoot, {
    allowExistingWorkflow: true
  });
  const standaloneSkills = DEFAULT_STANDALONE_SKILLS.map((skill) =>
    activateSkillFromDefinitions(skill, undefined, options.sources || getDefaultSources(), cacheRoot)
  );

  return {
    declaredCount: 1,
    materializedCount: workflow.installedDocs.length + workflow.installedTemplates + workflow.activatedSkills.length,
    activatedCount: workflow.activatedSkills.length,
    standaloneActivatedCount: standaloneSkills.length,
    manifestPath: workflow.manifestPath,
    lockfilePath: workflow.lockfilePath
  };
}
