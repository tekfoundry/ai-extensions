import { existsSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { activeRolePath } from "../paths/agents.js";
import type { LockfileRoleEntry, LockfileWorkflowEntry, SourceType } from "../schema.js";
import { discoverRoles, parseRoleFileFromPath } from "../roles/discovery.js";
import {
  assertActiveRoleFilesMatchLockfile,
  assertRolePackageFilesMatchLockfile,
  removeRoleFile,
  roleFileHashes,
  writeActiveRoleFile
} from "../roles/files.js";
import { assertRoleName } from "../roles/validation.js";
import type { WorkflowManifestFile } from "./types.js";

const WORKFLOW_ROLES_DIR = "roles/project-dev";

interface WorkflowRolePlan {
  sourcePath: string;
  packageRolePath: string;
  activationPath: string;
  originalName: string;
  activeName: string;
}

function workflowRolePlans(sourcePackagePath: string): WorkflowRolePlan[] {
  const rolesRoot = join(sourcePackagePath, WORKFLOW_ROLES_DIR);

  if (!existsSync(rolesRoot)) {
    return [];
  }

  return discoverRoles(rolesRoot).map((role) => {
    const sourcePath = join(WORKFLOW_ROLES_DIR, role.path);
    const packageRolePath = join(sourcePackagePath, sourcePath);

    return {
      sourcePath,
      packageRolePath,
      activationPath: activeRolePath(role.name),
      originalName: role.name,
      activeName: role.name
    };
  });
}

function assertNoWorkflowRoleCollision(
  lockfile: { roles?: LockfileRoleEntry[] },
  workflowName: string,
  workflowSource: string,
  plan: WorkflowRolePlan
): void {
  const existing = (lockfile.roles || []).find((role) => role.activeName === plan.activeName);

  if (
    existing &&
    (existing.source !== workflowSource ||
      existing.sourcePath !== plan.sourcePath ||
      existing.owner?.kind !== "workflow" ||
      existing.owner.name !== workflowName)
  ) {
    throw new AixError(`Active role name collision: ${plan.activeName}`);
  }
}

export function assertWorkflowRolesSafe(
  workflow: WorkflowManifestFile,
  workflowSource: string,
  sourcePackagePath: string,
  targetPackagePath: string,
  lockfile: { roles?: LockfileRoleEntry[] }
): void {
  for (const plan of workflowRolePlans(sourcePackagePath)) {
    const sourceRolePath = join(sourcePackagePath, plan.sourcePath);
    const targetRolePath = join(targetPackagePath, plan.sourcePath);
    const existing = (lockfile.roles || []).find(
      (role) => role.owner?.kind === "workflow" && role.owner.name === workflow.name && role.sourcePath === plan.sourcePath
    );

    parseRoleFileFromPath(sourceRolePath, { requireContract: true });
    assertRoleName(plan.activeName, "active role name");
    assertNoWorkflowRoleCollision(lockfile, workflow.name, workflowSource, plan);

    if (!existing && existsSync(plan.activationPath)) {
      throw new AixError(`Active role name collision: ${plan.activationPath}`);
    }

    if (existsSync(targetRolePath) && !existing) {
      throw new AixError(`Refusing to overwrite untracked workflow role package: ${targetRolePath}`);
    }
  }
}

export function assertWorkflowActiveRolesUnmodified(lockfile: { roles?: LockfileRoleEntry[] }, workflowName: string): void {
  for (const role of (lockfile.roles || []).filter((entry) => entry.owner?.kind === "workflow" && entry.owner.name === workflowName)) {
    assertActiveRoleFilesMatchLockfile(role, "update");
  }
}

export function installWorkflowRoles(
  workflow: WorkflowManifestFile,
  workflowSource: string,
  sourceType: SourceType,
  packagePath: string,
  previousWorkflow?: LockfileWorkflowEntry
): LockfileRoleEntry[] {
  const previousActiveNames = new Set(previousWorkflow?.roles?.map((role) => role.activeName) || []);
  const entries = workflowRolePlans(packagePath).map((plan): LockfileRoleEntry => {
    if (previousActiveNames.has(plan.activeName)) {
      removeRoleFile(plan.activationPath);
    }

    const activeFiles = writeActiveRoleFile(plan.packageRolePath, plan.activationPath, plan.activeName);

    return {
      kind: "role",
      source: workflowSource,
      sourceType,
      sourcePath: plan.sourcePath,
      packagePath: plan.packageRolePath,
      activationPath: plan.activationPath,
      originalName: plan.originalName,
      activeName: plan.activeName,
      requested: false,
      owner: {
        kind: "workflow",
        name: workflow.name
      },
      packageFiles: roleFileHashes(plan.packageRolePath),
      activeFiles
    };
  });

  const nextActiveNames = new Set(entries.map((entry) => entry.activeName));

  for (const activeName of previousActiveNames) {
    if (nextActiveNames.has(activeName)) {
      continue;
    }

    removeRoleFile(activeRolePath(activeName));
  }

  return entries;
}

export function workflowRoles(lockfile: { roles?: LockfileRoleEntry[] }, workflowName: string): LockfileRoleEntry[] {
  return (lockfile.roles || []).filter((role) => role.owner?.kind === "workflow" && role.owner.name === workflowName);
}

export function replaceWorkflowRoleEntries(
  lockfile: { roles?: LockfileRoleEntry[] },
  workflowName: string,
  roleEntries: LockfileRoleEntry[]
): void {
  lockfile.roles = [
    ...(lockfile.roles || []).filter((role) => role.owner?.kind !== "workflow" || role.owner.name !== workflowName),
    ...roleEntries
  ];
}

export function removeWorkflowActiveRoles(roles: LockfileRoleEntry[]): void {
  for (const role of roles) {
    removeRoleFile(role.activationPath);
  }
}

export function assertWorkflowRolesUnmodified(roles: LockfileRoleEntry[]): void {
  for (const role of roles) {
    assertActiveRoleFilesMatchLockfile(role);
    assertRolePackageFilesMatchLockfile(role);
  }
}
