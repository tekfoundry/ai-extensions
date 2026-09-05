import { existsSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { assertInstalledAppendBlockUnmodified } from "../agents-md.js";
import { extensionAppendDefinition, lockfileBlockForDefinition } from "../extension-append.js";
import { activeRolePath, roleEntrypointPath } from "../paths/agents.js";
import type { LockfileRoleEntry, LockfileWorkflowEntry, SourceType } from "../schema.js";
import { assertBundledRoleGuidance, discoverRoles, parseRoleFileFromPath } from "../roles/discovery.js";
import {
  assertActiveRoleFilesMatchLockfile,
  assertRolePackageFilesMatchLockfile,
  replaceActiveRoleFile,
  removeRoleFile,
  removeRolePackageFile,
  roleFileHashes,
  writeActiveRoleFile
} from "../roles/files.js";
import { removeManifestRole } from "../activation/manifest.js";
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

const LEGACY_ROLE_RENAMES: Record<string, string> = {
  "roles/project-dev/product-strategist": "roles/project-dev/product-owner"
};

const LEGACY_PRODUCT_STRATEGIST = "product-strategist";

function isStandaloneProductStrategist(role: LockfileRoleEntry): boolean {
  return !role.owner && (
    role.activeName === LEGACY_PRODUCT_STRATEGIST ||
    role.originalName === LEGACY_PRODUCT_STRATEGIST ||
    role.sourcePath.split("/").at(-1) === LEGACY_PRODUCT_STRATEGIST
  );
}

function hasBundledProductOwner(workflow: WorkflowManifestFile, sourcePackagePath: string): boolean {
  return workflowRolePlans(sourcePackagePath).some((plan) => plan.activeName === "product-owner");
}

function legacyRoleFor(plan: WorkflowRolePlan, previousRoles: LockfileRoleEntry[]): LockfileRoleEntry | undefined {
  const legacySourcePath = Object.entries(LEGACY_ROLE_RENAMES).find(([, next]) => next === plan.sourcePath)?.[0];
  return legacySourcePath
    ? previousRoles.find((role) => role.sourcePath === legacySourcePath && role.owner?.kind === "workflow")
    : undefined;
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
  plan: WorkflowRolePlan,
  targetRolePath: string
): void {
  const existing = (lockfile.roles || []).find((role) => role.activeName === plan.activeName);

  if (!existing) {
    return;
  }

  // A force rebuild is allowed to refresh a role only when the lockfile proves
  // that both the package and activation targets are the same managed asset.
  // Comparing only the name/source let stale or ambiguous entries reach the
  // materializer, while treating every existing name as foreign broke valid
  // current-layout installations.
  const isManagedMatch = existing.source === workflowSource &&
    existing.sourcePath === plan.sourcePath &&
    existing.packagePath === targetRolePath &&
    existing.activationPath === plan.activationPath &&
    existing.owner?.kind === "workflow" &&
    existing.owner.name === workflowName;

  if (!isManagedMatch) {
    throw new AixError(`Active role name collision: ${plan.activeName}`);
  }
}

export function assertWorkflowRolesSafe(
  workflow: WorkflowManifestFile,
  workflowSource: string,
  sourcePackagePath: string,
  targetPackagePath: string,
  lockfile: { roles?: LockfileRoleEntry[] },
  options: { reconcileProtected?: boolean } = {}
): void {
  if (hasBundledProductOwner(workflow, sourcePackagePath)) {
    const legacyEntries = (lockfile.roles || []).filter(isStandaloneProductStrategist);
    for (const legacy of legacyEntries) {
      if (!options.reconcileProtected) {
        assertRolePackageFilesMatchLockfile(legacy, "migrate");
        assertActiveRoleFilesMatchLockfile(legacy, "migrate");
      }
      if (legacy.agentsMd) {
        assertInstalledAppendBlockUnmodified(legacy.agentsMd);
      }
    }

    const trackedActivePaths = new Set(
      (lockfile.roles || [])
        .filter((role) =>
          role.activeName === LEGACY_PRODUCT_STRATEGIST ||
          role.originalName === LEGACY_PRODUCT_STRATEGIST ||
          role.sourcePath.split("/").at(-1) === LEGACY_PRODUCT_STRATEGIST
        )
        .map((role) => role.activationPath)
    );
    const staleActivePath = activeRolePath(LEGACY_PRODUCT_STRATEGIST);
    if (existsSync(staleActivePath) && !trackedActivePaths.has(staleActivePath)) {
      throw new AixError(
        `Refusing to activate product-owner while an untracked stale product-strategist role exists at ${staleActivePath}. Deactivate or restore that role, then retry.`
      );
    }
  }

  for (const plan of workflowRolePlans(sourcePackagePath)) {
    const sourceRolePath = join(sourcePackagePath, plan.sourcePath);
    const targetRolePath = join(targetPackagePath, plan.sourcePath);
    const existing = (lockfile.roles || []).find(
      (role) => role.owner?.kind === "workflow" && role.owner.name === workflow.name && role.sourcePath === plan.sourcePath
    );

    parseRoleFileFromPath(roleEntrypointPath(sourceRolePath), { requireContract: true });
    assertBundledRoleGuidance(sourceRolePath);
    assertRoleName(plan.activeName, "active role name");
    assertNoWorkflowRoleCollision(lockfile, workflow.name, workflowSource, plan, targetRolePath);

    const legacySourcePath = Object.entries(LEGACY_ROLE_RENAMES).find(([, next]) => next === plan.sourcePath)?.[0];
    const legacy = legacySourcePath
      ? (lockfile.roles || []).find((role) => role.owner?.kind === "workflow" && role.owner.name === workflow.name && role.sourcePath === legacySourcePath)
      : undefined;
    if (legacy) {
      if (!options.reconcileProtected) {
        assertRolePackageFilesMatchLockfile(legacy, "migrate");
        assertActiveRoleFilesMatchLockfile(legacy, "migrate");
      }
      if (existsSync(plan.activationPath)) {
        throw new AixError(`Cannot migrate ${legacySourcePath}: active role name collision: ${plan.activationPath}`);
      }
    }

    if (!existing && existsSync(plan.activationPath)) {
      throw new AixError(`Active role name collision: ${plan.activationPath}`);
    }

    if (existsSync(targetRolePath) && !existing) {
      throw new AixError(`Refusing to overwrite untracked workflow role package: ${targetRolePath}`);
    }
  }
}

export function retireStandaloneProductStrategist(
  workflow: WorkflowManifestFile,
  sourcePackagePath: string,
  lockfile: { roles?: LockfileRoleEntry[] },
  manifestJson: Record<string, unknown>,
  options: { reconcileProtected?: boolean } = {}
): LockfileRoleEntry[] {
  if (!hasBundledProductOwner(workflow, sourcePackagePath)) {
    return [];
  }

  const legacyEntries = (lockfile.roles || []).filter(isStandaloneProductStrategist);
  if (legacyEntries.length === 0) {
    return [];
  }

  for (const legacy of legacyEntries) {
    if (!options.reconcileProtected) {
      assertRolePackageFilesMatchLockfile(legacy, "migrate");
      assertActiveRoleFilesMatchLockfile(legacy, "migrate");
    }
    if (legacy.agentsMd) {
      assertInstalledAppendBlockUnmodified(legacy.agentsMd);
    }
  }

  lockfile.roles = (lockfile.roles || []).filter((role) => !legacyEntries.includes(role));

  for (const legacy of legacyEntries) {
    removeRoleFile(legacy.activationPath);
    removeRolePackageFile(legacy.packagePath);
    removeManifestRole(manifestJson, legacy.source, legacy.sourcePath);
  }

  return legacyEntries;
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
  previousWorkflow?: LockfileWorkflowEntry,
  previousRoles: LockfileRoleEntry[] = []
): LockfileRoleEntry[] {
  const previousActiveNames = new Set(previousWorkflow?.roles?.map((role) => role.activeName) || []);
  const previousRolesByActiveName = new Map(previousRoles.map((role) => [role.activeName, role]));
  const entries = workflowRolePlans(packagePath).map((plan): LockfileRoleEntry => {
    const previousRole = previousRolesByActiveName.get(plan.activeName) || legacyRoleFor(plan, previousRoles);
    const activeFiles = previousActiveNames.has(plan.activeName) && previousRole?.activeName === plan.activeName
      ? replaceActiveRoleFile(plan.packageRolePath, plan.activationPath, plan.activeName, previousRole)
      : writeActiveRoleFile(plan.packageRolePath, plan.activationPath, plan.activeName);
    const appendDefinition = extensionAppendDefinition("role", plan.activeName, workflowSource, plan.sourcePath, plan.packageRolePath);
    const agentsMd = lockfileBlockForDefinition(appendDefinition);

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
      ...(agentsMd ? { agentsMd } : {}),
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
  roleEntries: LockfileRoleEntry[],
  options: { removeDependencies?: boolean } = {}
): void {
  const workflow = (lockfile as { workflows?: LockfileWorkflowEntry[] }).workflows?.find((entry) => entry.name === workflowName);
  const directRoleKeys = new Set(workflow?.roles?.map((role) => `${workflowName}:${role.activeName}`) || []);
  lockfile.roles = [
    ...(lockfile.roles || []).filter((role) => {
      if (role.owner?.kind !== "workflow" || role.owner.name !== workflowName) {
        return true;
      }

      return options.removeDependencies !== true && !directRoleKeys.has(`${workflowName}:${role.activeName}`);
    }),
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
