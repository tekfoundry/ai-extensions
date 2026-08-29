import { existsSync } from "node:fs";
import { join } from "node:path";
import { extensionAppendDefinition, lockfileBlockForDefinition } from "../extension-append.js";
import { activeSkillPath } from "../paths/agents.js";
import type { LockfileSkillEntry, LockfileWorkflowEntry, SourceType } from "../schema.js";
import { discoverSkills, parseSkillNameFromDirectory } from "../skills.js";
import { activateDirectSymlink, assertActivationPathAvailable, assertActiveFilesMatchLockfile, removeActivePath } from "../activation/active-files.js";
import { assertNoActiveNameCollision } from "../activation/lockfile.js";
import { assertFolderNameSafe } from "../activation/naming.js";
import { packageFileHashes } from "../activation/package-files.js";
import type { WorkflowManifestFile } from "./types.js";

interface WorkflowSkillPlan {
  sourcePath: string;
  packageSkillPath: string;
  activationPath: string;
  originalName: string;
  activeName: string;
}

function workflowSkillPlans(workflow: WorkflowManifestFile, sourcePackagePath: string): WorkflowSkillPlan[] {
  const skillsRoot = join(sourcePackagePath, workflow.skillsDir);

  if (!existsSync(skillsRoot)) {
    return [];
  }

  return discoverSkills(skillsRoot).map((skill) => {
    const packageSkillPath = join(skillsRoot, skill.path);
    const originalName = parseSkillNameFromDirectory(packageSkillPath);
    const activeName = originalName;

    return {
      sourcePath: `${workflow.skillsDir}/${skill.path}`,
      packageSkillPath,
      activationPath: activeSkillPath(activeName),
      originalName,
      activeName
    };
  });
}

export function assertWorkflowSkillsSafe(
  workflow: WorkflowManifestFile,
  workflowSource: string,
  sourcePackagePath: string,
  targetPackagePath: string,
  lockfile: { skills: LockfileSkillEntry[] }
): void {
  for (const plan of workflowSkillPlans(workflow, sourcePackagePath)) {
    const targetSkillPath = join(targetPackagePath, plan.sourcePath);
    const existing = lockfile.skills.find(
      (locked) => locked.owner?.kind === "workflow" && locked.owner.name === workflow.name && locked.sourcePath === plan.sourcePath
    );

    assertFolderNameSafe(plan.activeName, "active skill name");
    assertNoActiveNameCollision(lockfile, plan.activeName, workflowSource, plan.sourcePath);

    if (!existing) {
      assertActivationPathAvailable(plan.activationPath, targetSkillPath);
    }
  }
}

export function assertWorkflowActiveSkillsUnmodified(lockfile: { skills: LockfileSkillEntry[] }, workflowName: string): void {
  for (const skill of lockfile.skills.filter((entry) => entry.owner?.kind === "workflow" && entry.owner.name === workflowName)) {
    assertActiveFilesMatchLockfile(skill, "update");
  }
}

export function installWorkflowSkills(
  workflow: WorkflowManifestFile,
  workflowSource: string,
  sourceType: SourceType,
  packagePath: string,
  previousSkills: LockfileSkillEntry[] = []
): LockfileSkillEntry[] {
  const entries = workflowSkillPlans(workflow, packagePath).map((plan): LockfileSkillEntry => {
    const activeFiles = activateDirectSymlink(plan.activationPath, plan.packageSkillPath);
    const appendDefinition = extensionAppendDefinition("skill", plan.activeName, workflowSource, plan.sourcePath, plan.packageSkillPath);
    const agentsMd = lockfileBlockForDefinition(appendDefinition);

    return {
      kind: "skill",
      source: workflowSource,
      sourceType,
      sourcePath: plan.sourcePath,
      packagePath: plan.packageSkillPath,
      activationPath: plan.activationPath,
      originalName: plan.originalName,
      activeName: plan.activeName,
      requested: false,
      owner: {
        kind: "workflow",
        name: workflow.name
      },
      ...(agentsMd ? { agentsMd } : {}),
      packageFiles: packageFileHashes(plan.packageSkillPath),
      activeFiles
    };
  });

  const nextActiveNames = new Set(entries.map((entry) => entry.activeName));

  for (const previousSkill of previousSkills) {
    if (nextActiveNames.has(previousSkill.activeName) || !existsSync(previousSkill.activationPath)) {
      continue;
    }

    removeActivePath(previousSkill.activationPath);
  }

  return entries;
}

export function removeWorkflowActiveSkills(workflowSkills: LockfileSkillEntry[]): void {
  for (const skill of workflowSkills) {
    removeActivePath(skill.activationPath);
  }
}

export function addWorkflowSkillVerifyIssues(
  issues: string[],
  workflow: LockfileWorkflowEntry,
  lockfile: { skills: LockfileSkillEntry[] }
): void {
  for (const skill of workflow.skills) {
    const lockedSkill = lockfile.skills.find((entry) => entry.activeName === skill.activeName && entry.owner?.kind === "workflow");

    if (!lockedSkill) {
      issues.push(`Workflow-owned skill is missing from the lockfile: ${skill.activeName}`);
    }
  }
}
