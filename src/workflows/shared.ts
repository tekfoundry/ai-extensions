import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { compareFileHashesToLockfile } from "../lockfile/drift.js";
import type { LockfileSkillEntry, LockfileWorkflowEntry } from "../schema.js";

export function assertWorkflowPackageUnmodified(workflow: LockfileWorkflowEntry, action: string): void {
  const comparison = compareFileHashesToLockfile(workflow.packagePath, workflow.packageFiles);

  if (!comparison.matches) {
    throw new AixError(`Refusing to ${action} modified workflow package: ${workflow.packagePath}`);
  }
}

export function workflowSkills(lockfile: { skills: LockfileSkillEntry[] }, workflowName: string): LockfileSkillEntry[] {
  return lockfile.skills.filter((skill) => skill.owner?.kind === "workflow" && skill.owner.name === workflowName);
}

export function replaceWorkflowSkillEntries(
  lockfile: { skills: LockfileSkillEntry[] },
  workflowName: string,
  skillEntries: LockfileSkillEntry[]
): void {
  lockfile.skills = [
    ...lockfile.skills.filter((skill) => skill.owner?.kind !== "workflow" || skill.owner.name !== workflowName),
    ...skillEntries
  ];
}

export function stageWorkflowPackage(resolvedRoot: string): { path: string; packageFiles: LockfileWorkflowEntry["packageFiles"] } {
  const path = mkdtempSync(join(tmpdir(), "aix-workflow-install-"));
  const packageFiles = copyFilesSafely(resolvedRoot, path);

  return { path, packageFiles };
}

export function removeStagedWorkflowPackage(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
