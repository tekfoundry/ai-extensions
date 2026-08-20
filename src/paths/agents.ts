import { join } from "node:path";

export const AGENTS_DIR = ".agents";
export const PACKAGES_DIR = ".agents/packages";
export const SKILL_PACKAGES_DIR = ".agents/packages/skills";
export const ACTIVE_SKILLS_DIR = ".agents/skills";

export function packageSkillPath(source: string, sourcePath: string): string {
  return join(SKILL_PACKAGES_DIR, source, sourcePath);
}

export function activeSkillPath(activeName: string): string {
  return join(ACTIVE_SKILLS_DIR, activeName);
}
