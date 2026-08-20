import { existsSync, statSync } from "node:fs";
import { AixError } from "../errors.js";
import { AGENTS_DIR } from "../paths/agents.js";
import { defaultCacheRoot, getDefaultWorkflowSources } from "../sources/index.js";
import { installWorkflowFromDefinitions } from "../workflows/index.js";
import type { InitOptions, InitResult } from "./types.js";

export function initProject(options: InitOptions = {}): InitResult {
  if (existsSync(AGENTS_DIR) && !statSync(AGENTS_DIR).isDirectory()) {
    throw new AixError(`${AGENTS_DIR} exists but is not a directory.`);
  }

  const cacheRoot = options.cacheRoot || defaultCacheRoot();
  const workflow = installWorkflowFromDefinitions(options.workflowSources || getDefaultWorkflowSources(), cacheRoot, {
    allowExistingWorkflow: true
  });

  return {
    declaredCount: 1,
    materializedCount: workflow.installedDocs.length + workflow.activatedSkills.length,
    activatedCount: workflow.activatedSkills.length,
    manifestPath: workflow.manifestPath,
    lockfilePath: workflow.lockfilePath
  };
}
