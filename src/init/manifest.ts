import type { SourceDefinition, SourceManifestEntry } from "../schema.js";
import { createSkillManifestEntry } from "../sources/index.js";
import type { SkillSource } from "./types.js";

function sourceManifestEntry(definition: SourceDefinition): SourceManifestEntry {
  const match = definition.url.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);

  if (!match || !definition.ref || !definition.path) {
    return definition;
  }

  const [, owner, repo] = match;

  return `https://github.com/${owner}/${repo}/tree/${definition.ref}/${definition.path}`;
}

export function createManifest(skillSources: SkillSource[], sources: Record<string, SourceDefinition>): Record<string, unknown> {
  return {
    sources: {
      skills: Object.fromEntries(Object.entries(sources).map(([name, definition]) => [name, sourceManifestEntry(definition)]))
    },
    skills: skillSources.map((skill) => createSkillManifestEntry(skill.source, skill.sourcePath))
  };
}
