import { existsSync } from "node:fs";
import { AixError } from "../errors.js";
import { compareFileHashesToLockfile } from "../lockfile/drift.js";
import { LOCKFILE_FILE_NAME, type WorkflowRequest } from "../schema.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { defaultCacheRoot, getDefaultWorkflowSources, loadWorkflowSourceDefinitions, resolveSourceFromDefinitions } from "../sources/index.js";
import { addAgentsMdVerifyIssues } from "./agents-md.js";
import { diffPackageAgainstSourceSnapshot } from "./diff.js";
import { addWorkflowDocVerifyIssues } from "./docs.js";
import { addWorkflowGuidanceVerifyIssues } from "./guidance.js";
import { addWorkflowSkillVerifyIssues } from "./skills.js";
import { addWorkflowTemplateVerifyIssues } from "./templates.js";
import { readWorkflowTeam, workflowTeamHash } from "./team.js";
import { readWorkflowManifest } from "./manifest.js";
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

  const sourcePath = workflow.sourceType === "local" ? workflow.sourcePath : undefined;

  if (sourcePath && !existsSync(sourcePath)) {
    throw new AixError(`Local workflow source is missing: ${sourcePath}`);
  }

  const resolvedRoot = sourcePath
    ? sourcePath
    : resolveSourceFromDefinitions(workflow.source, loadWorkflowSourceDefinitions(), cacheRoot).rootPath;
  const diff = diffPackageAgainstSourceSnapshot(workflow.packagePath, resolvedRoot);

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    diffs: diff.trim() ? [{ name: workflow.name, packagePath: workflow.packagePath, sourcePath: resolvedRoot, diff }] : []
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
    addWorkflowGuidanceVerifyIssues(issues, workflow);
    addWorkflowTemplateVerifyIssues(issues, workflow);
    addAgentsMdVerifyIssues(issues, workflow.agentsMd);
    addWorkflowSkillVerifyIssues(issues, workflow, lockfile);

    if (workflow.team) {
      try {
        const packageWorkflow = readWorkflowManifest(workflow.packagePath);
        readWorkflowTeam(packageWorkflow, workflow.packagePath);
        const expectedTeam = workflowTeamHash(packageWorkflow, workflow.packagePath);

        if (!expectedTeam || workflow.team.sha256 !== expectedTeam.sha256) {
          issues.push(`Workflow team metadata has drift: ${workflow.packagePath}/${workflow.team.path}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(`Workflow team verification unavailable: ${message}`);
      }
    }

    for (const dependency of workflow.dependencies?.roles || []) {
      const role = (lockfile.roles || []).find(
        (entry) => entry.source === dependency.source && entry.sourcePath === dependency.sourcePath && entry.activeName === dependency.activeName
      );

      if (!role) {
        issues.push(`Workflow dependency is not active: ${dependency.source}/${dependency.sourcePath}`);
      }
    }
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
