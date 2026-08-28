import { join } from "node:path";

export const AGENTS_DIR = ".agents";
export const PACKAGES_DIR = ".agents/packages";
export const SKILL_PACKAGES_DIR = ".agents/packages/skills";
export const ROLE_PACKAGES_DIR = ".agents/packages/roles";
export const WORKFLOW_PACKAGES_DIR = ".agents/packages/workflows";
export const ACTIVE_SKILLS_DIR = ".agents/skills";
export const ACTIVE_ROLES_DIR = ".agents/roles";

export function packageSkillPath(source: string, sourcePath: string): string {
  return join(SKILL_PACKAGES_DIR, source, sourcePath);
}

export function activeSkillPath(activeName: string): string {
  return join(ACTIVE_SKILLS_DIR, activeName);
}

export function packageRolePath(source: string, sourcePath: string): string {
  return join(ROLE_PACKAGES_DIR, source, sourcePath);
}

export function activeRolePath(activeName: string): string {
  return join(ACTIVE_ROLES_DIR, activeName);
}

export function roleEntrypointPath(rolePath: string): string {
  return join(rolePath, "ROLE.md");
}

export function packageWorkflowPath(source: string, workflowName: string): string {
  return join(WORKFLOW_PACKAGES_DIR, source, workflowName);
}

export function workflowRoleSourcePath(workflowName: string, rolePath: string): string {
  return join("roles", workflowName, rolePath);
}

export function bundledAixRolePackPath(packName: string): string {
  return join("aix", "roles", packName);
}
