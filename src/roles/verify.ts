import { existsSync } from "node:fs";
import { activeRolePath, packageRolePath, roleEntrypointPath } from "../paths/agents.js";
import { readLockfileJson } from "../activation/lockfile.js";
import type { LockfileRoleEntry } from "../schema.js";
import { parseRoleFileFromPath } from "./discovery.js";
import { roleContractIssues } from "./validation.js";
import { assertActiveRoleFilesMatchLockfile, assertRolePackageFilesMatchLockfile } from "./files.js";

export interface VerifyRolesResult {
  issues: string[];
}

function addHashIssue(issues: string[], callback: () => void): void {
  try {
    callback();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
  }
}

function addRoleFileIssues(issues: string[], label: string, entry: LockfileRoleEntry, path: string, expectedName: string): void {
  if (!existsSync(path)) {
    issues.push(`${label} is missing: ${path}`);
    return;
  }

  try {
    const role = parseRoleFileFromPath(roleEntrypointPath(path), { requireContract: false });

    if (role.name !== expectedName) {
      issues.push(`${label} name mismatch for ${entry.activeName}: expected ${expectedName} got ${role.name}`);
    }

    issues.push(...roleContractIssues(role).map((issue) => `${label} contract issue: ${issue}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`${label} has invalid role file at ${path}: ${message}`);
  }
}

export function verifyRoles(): VerifyRolesResult {
  const lockfile = readLockfileJson();
  const roles = lockfile.roles || [];
  const issues: string[] = [];
  const activeNames = new Map<string, LockfileRoleEntry>();

  for (const role of roles) {
    const existingActiveName = activeNames.get(role.activeName);

    if (existingActiveName) {
      issues.push(`Active role name collision in lockfile: ${role.activeName}`);
    } else {
      activeNames.set(role.activeName, role);
    }

    if (!role.owner && role.packagePath !== packageRolePath(role.source, role.sourcePath)) {
      issues.push(`Lockfile role package path mismatch for ${role.source}/${role.sourcePath}: ${role.packagePath}`);
    }

    if (role.activationPath !== activeRolePath(role.activeName)) {
      issues.push(`Lockfile active role path mismatch for ${role.activeName}: ${role.activationPath}`);
    }

    if (role.alias && role.alias !== role.activeName) {
      issues.push(`Role alias mismatch for ${role.source}/${role.sourcePath}: alias ${role.alias} active ${role.activeName}`);
    }

    if (!role.alias && role.activeName !== role.originalName) {
      issues.push(`Active role name mismatch for ${role.source}/${role.sourcePath}: expected ${role.originalName} got ${role.activeName}`);
    }

    addHashIssue(issues, () => assertRolePackageFilesMatchLockfile(role));
    addHashIssue(issues, () => assertActiveRoleFilesMatchLockfile(role));

    addRoleFileIssues(issues, "Role package", role, role.packagePath, role.originalName);
    addRoleFileIssues(issues, "Active role", role, role.activationPath, role.activeName);
  }

  for (const workflow of lockfile.workflows || []) {
    for (const role of workflow.roles || []) {
      const lockedRole = roles.find((entry) => entry.activeName === role.activeName && entry.owner?.kind === "workflow");

      if (!lockedRole) {
        issues.push(`Workflow-owned role is missing from the lockfile: ${role.activeName}`);
      }
    }
  }

  return { issues };
}
