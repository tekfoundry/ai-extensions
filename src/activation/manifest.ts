import { parseManifest, parseSourceDefinition } from "../manifest.js";
import type { SkillManifestEntry, SourceDefinition } from "../schema.js";
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

function sameSkillRequest(skill: SkillManifestEntry, source: string, sourcePath: string): boolean {
  if (typeof skill === "string") {
    return skill === `${source}:${sourcePath}`;
  }

  return skill.source === source && skill.path === sourcePath;
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
