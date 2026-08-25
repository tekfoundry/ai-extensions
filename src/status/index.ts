import { existsSync, readFileSync } from "node:fs";
import { diffSkills, verifySkills } from "../activation.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { parseManifest } from "../manifest.js";
import { verifyRoles } from "../roles/index.js";
import { diffWorkflow, verifyWorkflow } from "../workflows/index.js";
import {
  LOCKFILE_FILE_NAME,
  MANIFEST_FILE_NAME,
  type LockfileRoleEntry,
  type LockfileSkillEntry,
  type SkillsManifest,
  type SourceDefinition
} from "../schema.js";

export interface StatusSkill {
  activeName: string;
  source: string;
  sourcePath: string;
  requestedRef?: string;
  resolvedCommit?: string;
  packagePath: string;
  activationPath: string;
}

export interface StatusRole {
  activeName: string;
  source: string;
  sourcePath: string;
  requestedRef?: string;
  resolvedCommit?: string;
  packagePath: string;
  activationPath: string;
}

export interface WorkspaceStatus {
  manifestPath: string;
  lockfilePath: string;
  manifestExists: boolean;
  lockfileExists: boolean;
  manifest?: SkillsManifest;
  activeWorkflow?: {
    name: string;
    title?: string;
    source: string;
    sourcePath: string;
    requestedRef?: string;
    resolvedCommit?: string;
    packagePath: string;
    docCount: number;
    templateCount: number;
    skillCount: number;
    roleCount: number;
  };
  skillSources: Array<{
    name: string;
    type: string;
    url?: string;
    path?: string;
    ref?: string;
  }>;
  workflowSources: Array<{
    name: string;
    type: string;
    url?: string;
    path?: string;
    ref?: string;
  }>;
  activeSkills: StatusSkill[];
  dependencySkills: StatusSkill[];
  workflowSkills: StatusSkill[];
  activeRoles: StatusRole[];
  workflowRoles: StatusRole[];
  verificationIssues: string[];
  update: {
    checked: boolean;
    unavailableReason?: string;
    skillUpdates: Array<{
      activeName: string;
      source: string;
      sourcePath: string;
    }>;
    workflowUpdates: Array<{
      name: string;
    }>;
  };
}

function readManifest(): SkillsManifest | undefined {
  if (!existsSync(MANIFEST_FILE_NAME)) {
    return undefined;
  }

  return parseManifest(JSON.parse(readFileSync(MANIFEST_FILE_NAME, "utf8")));
}

function statusSkill(skill: LockfileSkillEntry, inherited?: { requestedRef?: string; resolvedCommit?: string }): StatusSkill {
  return {
    activeName: skill.activeName,
    source: skill.source,
    sourcePath: skill.sourcePath,
    ...(skill.requestedRef || inherited?.requestedRef ? { requestedRef: skill.requestedRef || inherited?.requestedRef } : {}),
    ...(skill.resolvedCommit || inherited?.resolvedCommit ? { resolvedCommit: skill.resolvedCommit || inherited?.resolvedCommit } : {}),
    packagePath: skill.packagePath,
    activationPath: skill.activationPath
  };
}

function statusRole(role: LockfileRoleEntry, inherited?: { requestedRef?: string; resolvedCommit?: string }): StatusRole {
  return {
    activeName: role.activeName,
    source: role.source,
    sourcePath: role.sourcePath,
    ...(role.requestedRef || inherited?.requestedRef ? { requestedRef: role.requestedRef || inherited?.requestedRef } : {}),
    ...(role.resolvedCommit || inherited?.resolvedCommit ? { resolvedCommit: role.resolvedCommit || inherited?.resolvedCommit } : {}),
    packagePath: role.packagePath,
    activationPath: role.activationPath
  };
}

function collectVerificationIssues(manifestExists: boolean): string[] {
  const issues: string[] = [];

  if (manifestExists) {
    try {
      issues.push(...verifySkills().issues);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`Skill verification unavailable: ${message}`);
    }
  }

  try {
    issues.push(...verifyRoles().issues);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Role verification unavailable: ${message}`);
  }

  try {
    issues.push(...verifyWorkflow().issues);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Workflow verification unavailable: ${message}`);
  }

  return issues;
}

function collectUpdateStatus(manifestExists: boolean): WorkspaceStatus["update"] {
  if (!manifestExists) {
    return {
      checked: false,
      unavailableReason: `Missing ${MANIFEST_FILE_NAME}.`,
      skillUpdates: [],
      workflowUpdates: []
    };
  }

  try {
    const skillDiffs = diffSkills().diffs;
    const workflowDiffs = diffWorkflow().diffs;

    return {
      checked: true,
      skillUpdates: skillDiffs.map((skill) => ({
        activeName: skill.activeName,
        source: skill.source,
        sourcePath: skill.sourcePath
      })),
      workflowUpdates: workflowDiffs.map((workflow) => ({ name: workflow.name }))
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      checked: false,
      unavailableReason: message,
      skillUpdates: [],
      workflowUpdates: []
    };
  }
}

function sourceRows(sources: Record<string, SourceDefinition> | undefined) {
  return Object.entries(sources || {}).map(([name, source]) => ({
    name,
    type: source.type,
    url: source.url,
    path: source.path,
    ref: source.ref
  }));
}

export function collectWorkspaceStatus(): WorkspaceStatus {
  const manifestExists = existsSync(MANIFEST_FILE_NAME);
  const lockfileExists = existsSync(LOCKFILE_FILE_NAME);
  const manifest = readManifest();
  const lockfile = readLockfileJson();
  const activeWorkflow = lockfile.workflows?.[0];

  return {
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    manifestExists,
    lockfileExists,
    ...(manifest ? { manifest } : {}),
    ...(activeWorkflow
      ? {
          activeWorkflow: {
            name: activeWorkflow.name,
            ...(activeWorkflow.title ? { title: activeWorkflow.title } : {}),
            source: activeWorkflow.source,
            sourcePath: activeWorkflow.sourcePath,
            ...(activeWorkflow.requestedRef ? { requestedRef: activeWorkflow.requestedRef } : {}),
            ...(activeWorkflow.resolvedCommit ? { resolvedCommit: activeWorkflow.resolvedCommit } : {}),
            packagePath: activeWorkflow.packagePath,
            docCount: activeWorkflow.docs.length,
            templateCount: activeWorkflow.templates?.length || 0,
            skillCount: activeWorkflow.skills.length,
            roleCount: activeWorkflow.roles?.length || 0
          }
        }
      : {}),
    skillSources: sourceRows(manifest?.sources as Record<string, SourceDefinition> | undefined),
    workflowSources: sourceRows(manifest?.workflowSources as Record<string, SourceDefinition> | undefined),
    activeSkills: lockfile.skills.filter((skill) => skill.requested && !skill.owner).map((skill) => statusSkill(skill)),
    dependencySkills: lockfile.skills.filter((skill) => !skill.requested && !skill.owner).map((skill) => statusSkill(skill)),
    workflowSkills: lockfile.skills
      .filter((skill) => skill.owner?.kind === "workflow")
      .map((skill) => statusSkill(skill, activeWorkflow)),
    activeRoles: (lockfile.roles || []).filter((role) => role.requested && !role.owner).map((role) => statusRole(role)),
    workflowRoles: (lockfile.roles || [])
      .filter((role) => role.owner?.kind === "workflow")
      .map((role) => statusRole(role, activeWorkflow)),
    verificationIssues: collectVerificationIssues(manifestExists),
    update: collectUpdateStatus(manifestExists)
  };
}
