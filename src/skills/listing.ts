import { AixError } from "../errors.js";
import { loadSourceDefinitions, readSourceMetadata, resolveSource, writeSourceMetadata } from "../sources/index.js";
import { discoverSkills } from "./discovery.js";
import type { DiscoveredSkill } from "./types.js";

export function listSourceSkills(sourceName: string): DiscoveredSkill[] {
  const sources = loadSourceDefinitions();
  const definition = sources[sourceName];

  if (!definition) {
    throw new AixError(`Unknown source: ${sourceName}`);
  }

  const metadata = readSourceMetadata(sourceName, definition);

  if (metadata) {
    return metadata.skills;
  }

  const resolved = resolveSource(sourceName);
  const skills = discoverSkills(resolved.rootPath);

  writeSourceMetadata(
    {
      source: sourceName,
      kind: "skill",
      sourceType: "git",
      sourceUrl: definition.url,
      requestedRef: definition.ref,
      resolvedCommit: resolved.resolvedCommit,
      sourcePath: definition.path,
      skills
    }
  );

  return skills;
}
