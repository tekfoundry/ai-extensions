import { existsSync } from "node:fs";
import { parseManifest } from "../manifest.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME } from "../schema.js";
import { readJsonObject, writeJsonObjectAtomic } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { AixError } from "../errors.js";
import { defaultCacheRoot, loadWorkflowSourceDefinitions, resolveSourceFromDefinitions } from "../sources/index.js";
import { installResolvedWorkflow } from "./install.js";
import type { UpdateWorkflowResult } from "./types.js";

export function updateWorkflow(cacheRoot = defaultCacheRoot(), options: { reconcileProtected?: boolean } = {}): UpdateWorkflowResult {
  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifestJson);

  const lockfile = readLockfileJson();
  const workflow = lockfile.workflows?.[0];

  if (!workflow) {
    return {
      lockfilePath: LOCKFILE_FILE_NAME,
      updatedWorkflows: []
    };
  }

  if (workflow.sourceType === "local") {
    if (!existsSync(workflow.sourcePath)) {
      throw new AixError(`Local workflow source is missing: ${workflow.sourcePath}`);
    }

    const definition = {
      type: "git" as const,
      url: ".",
      path: workflow.sourcePath
    };
    const result = installResolvedWorkflow(
      workflow.source,
      definition,
      workflow.sourcePath,
      workflow.sourcePath,
      undefined,
      manifestJson,
      lockfile,
      { allowExistingWorkflow: true, sourceType: "local", reconcileProtected: options.reconcileProtected }
    );

    writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
    writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

    return {
      lockfilePath: LOCKFILE_FILE_NAME,
      updatedWorkflows: [
        {
          name: result.name
        }
      ]
    };
  }

  const definitions = loadWorkflowSourceDefinitions();
  const definition = definitions[workflow.source];

  if (!definition) {
    throw new AixError(`Unknown workflow source: ${workflow.source}`);
  }

  const resolved = resolveSourceFromDefinitions(workflow.source, definitions, cacheRoot);
  const previousResolvedCommit = workflow.resolvedCommit;
  const result = installResolvedWorkflow(
    workflow.source,
    definition,
    definition.path || workflow.sourcePath,
    resolved.rootPath,
    resolved.resolvedCommit,
    manifestJson,
    lockfile,
    { allowExistingWorkflow: true, reconcileProtected: options.reconcileProtected }
  );

  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    updatedWorkflows: [
      {
        name: result.name,
        previousResolvedCommit,
        resolvedCommit: resolved.resolvedCommit
      }
    ]
  };
}
