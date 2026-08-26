import { parseManifest, parseSourceDefinition } from "../manifest.js";
import type { RoleManifestEntry, SkillManifestEntry, SourceDefinition } from "../schema.js";
import { isRecord } from "../validation/types.js";

function skillManifestEntry(source: string, sourcePath: string, alias?: string): SkillManifestEntry {
  if (alias) {
    return {
      source,
      path: sourcePath,
      alias
    };
  }

  return `${source}:${sourcePath}`;
}

function roleManifestEntry(source: string, sourcePath: string, alias?: string): RoleManifestEntry {
  if (alias) {
    return {
      source,
      path: sourcePath,
      alias
    };
  }

  return `${source}:${sourcePath}`;
}

function sameSkillRequest(skill: SkillManifestEntry, source: string, sourcePath: string): boolean {
  if (typeof skill === "string") {
    return skill === `${source}:${sourcePath}`;
  }

  return skill.source === source && skill.path === sourcePath;
}

function sameRoleRequest(role: RoleManifestEntry, source: string, sourcePath: string): boolean {
  if (typeof role === "string") {
    return role === `${source}:${sourcePath}`;
  }

  return role.source === source && role.path === sourcePath;
}

export function updateManifestSkills(
  manifestJson: Record<string, unknown>,
  source: string,
  sourcePath: string,
  alias?: string
): void {
  const manifest = parseManifest(manifestJson);
  const nextEntry = skillManifestEntry(source, sourcePath, alias);
  const existingIndex = manifest.skills.findIndex((skill) => sameSkillRequest(skill, source, sourcePath));
  const skills = Array.isArray(manifestJson.skills) ? [...manifestJson.skills] : [];

  if (existingIndex >= 0) {
    skills[existingIndex] = nextEntry;
  } else {
    skills.push(nextEntry);
  }

  manifestJson.skills = skills;
}

export function removeManifestSkill(manifestJson: Record<string, unknown>, source: string, sourcePath: string): void {
  const manifest = parseManifest(manifestJson);
  const skills = Array.isArray(manifestJson.skills) ? [...manifestJson.skills] : [];

  manifestJson.skills = skills.filter((_skill, index) => !sameSkillRequest(manifest.skills[index], source, sourcePath));
}

export function updateManifestRoles(
  manifestJson: Record<string, unknown>,
  source: string,
  sourcePath: string,
  alias?: string
): void {
  const manifest = parseManifest(manifestJson);
  const nextEntry = roleManifestEntry(source, sourcePath, alias);
  const existingIndex = (manifest.roles || []).findIndex((role) => sameRoleRequest(role, source, sourcePath));
  const roles = Array.isArray(manifestJson.roles) ? [...manifestJson.roles] : [];

  if (existingIndex >= 0) {
    roles[existingIndex] = nextEntry;
  } else {
    roles.push(nextEntry);
  }

  manifestJson.roles = roles;
}

export function removeManifestRole(manifestJson: Record<string, unknown>, source: string, sourcePath: string): void {
  const manifest = parseManifest(manifestJson);
  const roles = Array.isArray(manifestJson.roles) ? [...manifestJson.roles] : [];

  manifestJson.roles = roles.filter((_role, index) => {
    const parsedRole = (manifest.roles || [])[index];

    return parsedRole ? !sameRoleRequest(parsedRole, source, sourcePath) : true;
  });
}

export function manifestSourceDefinitions(manifestJson: Record<string, unknown>): Record<string, SourceDefinition> {
  if (!isRecord(manifestJson.sources)) {
    return {};
  }

  const skillSources = isRecord(manifestJson.sources.skills) ? manifestJson.sources.skills : manifestJson.sources;
  const pathPrefix = isRecord(manifestJson.sources.skills) ? "sources.skills" : "sources";
  const sources: Record<string, SourceDefinition> = {};

  for (const [name, source] of Object.entries(skillSources)) {
    sources[name] = parseSourceDefinition(source, `${pathPrefix}.${name}`);
  }

  return sources;
}

export function manifestRoleSourceDefinitions(manifestJson: Record<string, unknown>): Record<string, SourceDefinition> {
  if (!isRecord(manifestJson.sources) || !isRecord(manifestJson.sources.roles)) {
    return {};
  }

  const sources: Record<string, SourceDefinition> = {};

  for (const [name, source] of Object.entries(manifestJson.sources.roles)) {
    sources[name] = parseSourceDefinition(source, `sources.roles.${name}`);
  }

  return sources;
}
