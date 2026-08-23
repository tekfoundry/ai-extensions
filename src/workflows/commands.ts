import { compareFileHashesToLockfile } from "../lockfile/drift.js";
import { LOCKFILE_FILE_NAME, type WorkflowRequest } from "../schema.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { defaultCacheRoot, getDefaultWorkflowSources, loadWorkflowSourceDefinitions, resolveSourceFromDefinitions } from "../sources/index.js";
import { addAgentsMdVerifyIssues } from "./agents-md.js";
import { diffPackageAgainstSourceSnapshot } from "./diff.js";
import { addWorkflowDocVerifyIssues } from "./docs.js";
import { addWorkflowSkillVerifyIssues } from "./skills.js";
import { addWorkflowTemplateVerifyIssues } from "./templates.js";
import type { DiffWorkflowResult, VerifyWorkflowResult } from "./types.js";

export function diffWorkflow(cacheRoot = defaultCacheRoot()): DiffWorkflowResult {
  const lockfile = readLockfileJson();
  const workflow = lockfile.workflows?.[0];

  if (!workflow) {
    return {
      lockfilePath: LOCKFILE_FILE_NAME,
      diffs: []
    };
  }

  const definitions = loadWorkflowSourceDefinitions();
  const resolved = resolveSourceFromDefinitions(workflow.source, definitions, cacheRoot);
  const diff = diffPackageAgainstSourceSnapshot(workflow.packagePath, resolved.rootPath);

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    diffs: diff.trim() ? [{ name: workflow.name, packagePath: workflow.packagePath, sourcePath: resolved.rootPath, diff }] : []
  };
}

export function verifyWorkflow(): VerifyWorkflowResult {
  const issues: string[] = [];
  const lockfile = readLockfileJson();
  const workflows = lockfile.workflows || [];

  if (workflows.length > 1) {
    issues.push("Only one workflow can be active at a time.");
  }

  for (const workflow of workflows) {
    const comparison = compareFileHashesToLockfile(workflow.packagePath, workflow.packageFiles);

    if (!comparison.matches) {
      issues.push(`Workflow package has drift: ${workflow.packagePath}`);
    }

    addWorkflowDocVerifyIssues(issues, workflow);
    addWorkflowTemplateVerifyIssues(issues, workflow);
    addAgentsMdVerifyIssues(issues, workflow.agentsMd);
    addWorkflowSkillVerifyIssues(issues, workflow, lockfile);
  }

  return { issues };
}

export function defaultWorkflowRequest(): WorkflowRequest {
  const [source, definition] = Object.entries(getDefaultWorkflowSources())[0];

  return {
    source,
    path: definition.path || "."
  };
}
