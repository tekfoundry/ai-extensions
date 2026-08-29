import { parseManifest } from "../manifest.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME } from "../schema.js";
import { assertActiveFilesMatchLockfile } from "../activation/active-files.js";
import { writeExtensionAppendBlocks } from "../extension-append.js";
import { readJsonObject, writeJsonObjectAtomic } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { assertPackageFilesMatchLockfile, removePackagePath } from "../activation/package-files.js";
import { AixError } from "../errors.js";
import { assertAgentsMdBlockUnmodified } from "./agents-md.js";
import { assertWorkflowDocsUnmodified, removeWorkflowDocs } from "./docs.js";
import { assertWorkflowRolesUnmodified, removeWorkflowActiveRoles, replaceWorkflowRoleEntries, workflowRoles } from "./roles.js";
import { removeWorkflowActiveSkills } from "./skills.js";
import { assertWorkflowPackageUnmodified, replaceWorkflowSkillEntries, workflowSkills } from "./shared.js";
import { assertWorkflowTemplatesUnmodified } from "./templates.js";
import type { RemoveWorkflowResult } from "./types.js";

export function removeWorkflow(): RemoveWorkflowResult {
  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifestJson);

  const lockfile = readLockfileJson();
  const previousLockfile = structuredClone(lockfile);
  const workflow = lockfile.workflows?.[0];

  if (!workflow) {
    throw new AixError("No active workflow is installed.");
  }

  const ownedSkills = workflowSkills(lockfile, workflow.name);
  const ownedRoles = workflowRoles(lockfile, workflow.name);
  assertWorkflowPackageUnmodified(workflow, "remove");

  for (const skill of ownedSkills) {
    assertActiveFilesMatchLockfile(skill);
    assertPackageFilesMatchLockfile(skill);
  }
  assertWorkflowRolesUnmodified(ownedRoles);

  assertWorkflowDocsUnmodified(workflow);
  assertWorkflowTemplatesUnmodified(workflow);
  assertAgentsMdBlockUnmodified(workflow.agentsMd);

  const nextLockfile = structuredClone(lockfile);
  replaceWorkflowSkillEntries(nextLockfile, workflow.name, []);
  replaceWorkflowRoleEntries(nextLockfile, workflow.name, []);
  nextLockfile.workflows = [];
  writeExtensionAppendBlocks(previousLockfile, nextLockfile, []);

  removeWorkflowActiveSkills(ownedSkills);
  removeWorkflowActiveRoles(ownedRoles);
  removeWorkflowDocs(workflow);

  removePackagePath(workflow.packagePath);
  replaceWorkflowSkillEntries(lockfile, workflow.name, []);
  replaceWorkflowRoleEntries(lockfile, workflow.name, []);
  lockfile.workflows = [];
  delete manifestJson.workflow;

  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    name: workflow.name,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    removedDocs: workflow.docs.map((doc) => doc.targetPath),
    removedSkills: ownedSkills.map((skill) => skill.activeName),
    removedRoles: ownedRoles.map((role) => role.activeName),
    removedAgentsMdBlock: Boolean(workflow.agentsMd || ownedSkills.some((skill) => skill.agentsMd) || ownedRoles.some((role) => role.agentsMd))
  };
}
