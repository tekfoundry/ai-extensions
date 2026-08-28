import { AixError } from "../errors.js";
import type { SourceDefinition } from "../schema.js";
import { discoverSkills } from "../skills.js";
import { resolveSourceFromDefinitions, type ResolvedSource } from "../sources/index.js";
import type { SkillSource } from "./types.js";

const DEFAULT_STANDALONE_SKILLS = ["discover-skill"];

export function resolveDefaultSources(sources: Record<string, SourceDefinition>, cacheRoot: string): Record<string, ResolvedSource> {
  return Object.fromEntries(
    Object.keys(sources)
      .sort()
      .map((name) => [name, resolveSourceFromDefinitions(name, sources, cacheRoot)])
  );
}

export function buildSkillSources(resolvedSources: Record<string, ResolvedSource>): SkillSource[] {
  const aixSource = resolvedSources.aix;
  const cursorPstackSource = resolvedSources["cursor-pstack"];

  if (!aixSource) {
    throw new AixError("Missing default source: aix");
  }

  if (!cursorPstackSource) {
    throw new AixError("Missing default source: cursor-pstack");
  }

  const bundledSkills = discoverSkills(aixSource.rootPath).map((skill) => ({
    source: "aix",
    resolvedSource: aixSource,
    sourcePath: skill.path
  }));

  return [
    ...bundledSkills,
    {
      source: "cursor-pstack",
      resolvedSource: cursorPstackSource,
      sourcePath: "unslop"
    }
  ];
}

export function defaultStandaloneSkillTargets(sources: Record<string, SourceDefinition>, cacheRoot: string): string[] {
  const aixSource = sources.aix;

  if (!aixSource) {
    throw new AixError("Missing default source: aix");
  }

  const resolvedSource = resolveSourceFromDefinitions("aix", sources, cacheRoot);

  const bundledSkills = new Set(discoverSkills(resolvedSource.rootPath).map((skill) => skill.path));

  return DEFAULT_STANDALONE_SKILLS
    .filter((skillPath) => bundledSkills.has(skillPath))
    .map((skillPath) => `aix/${skillPath}`)
    .sort();
}
