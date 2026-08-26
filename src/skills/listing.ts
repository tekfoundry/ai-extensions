import { join } from "node:path";
import { AixError } from "../errors.js";
import { readLockfileJson } from "../activation/lockfile.js";
import {
  loadSourceDefinitions,
  loadWorkflowSourceDefinitions,
  readSourceMetadata,
  resolveSource,
  resolveSourceFromDefinitions,
  writeSourceMetadata
} from "../sources/index.js";
import { readWorkflowManifest } from "../workflows/manifest.js";
import { discoverSkills } from "./discovery.js";
import type { DiscoveredSkill, ListedSkill } from "./types.js";

interface SkillListCandidate {
  path: string;
  name: string;
  lockSource: string;
  lockSourcePath: string;
  installCommand: string;
}

interface ListSourceSkillsOptions {
  missingOnly?: boolean;
}

function skillRows(sourceName: string, skills: DiscoveredSkill[]): SkillListCandidate[] {
  return skills.map((skill) => ({
    ...skill,
    lockSource: sourceName,
    lockSourcePath: skill.path,
    installCommand: `aix skill activate ${sourceName}/${skill.path}`
  }));
}

function installedWorkflowSkillRows(sourceName: string): SkillListCandidate[] {
  if (sourceName !== "aix") {
    return [];
  }

  const lockfile = readLockfileJson();
  const workflow = lockfile.workflows?.[0];

  if (!workflow || workflow.source !== sourceName) {
    return [];
  }

  const definitions = loadWorkflowSourceDefinitions();
  const definition = definitions[sourceName];

  if (!definition) {
    return [];
  }

  const resolved = resolveSourceFromDefinitions(sourceName, definitions);
  const manifest = readWorkflowManifest(resolved.rootPath);
  const skills = discoverSkills(join(resolved.rootPath, manifest.skillsDir));

  return skills.map((skill) => ({
    path: `${workflow.sourcePath}/${manifest.skillsDir}/${skill.path}`,
    name: skill.name,
    lockSource: sourceName,
    lockSourcePath: `${manifest.skillsDir}/${skill.path}`,
    installCommand: "aix workflow update"
  }));
}

function renderListedSkills(candidates: SkillListCandidate[], options: ListSourceSkillsOptions): ListedSkill[] {
  const lockfile = readLockfileJson();
  const rows = options.missingOnly
    ? candidates.filter((candidate) => !lockfile.skills.some((skill) => (
      (skill.source === candidate.lockSource && skill.sourcePath === candidate.lockSourcePath) ||
      skill.originalName === candidate.name ||
      skill.activeName === candidate.name
    )))
    : candidates;

  return rows.map(({ path, name, installCommand }) => ({ path, name, installCommand }));
}

export function listSourceSkills(sourceName: string, options: ListSourceSkillsOptions = {}): ListedSkill[] {
  const sources = loadSourceDefinitions();
  const definition = sources[sourceName];

  if (!definition) {
    throw new AixError(`Unknown source: ${sourceName}`);
  }

  const metadata = readSourceMetadata(sourceName, definition);

  if (metadata) {
    return renderListedSkills([
      ...skillRows(sourceName, metadata.skills),
      ...installedWorkflowSkillRows(sourceName)
    ], options);
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

  return renderListedSkills([
    ...skillRows(sourceName, skills),
    ...installedWorkflowSkillRows(sourceName)
  ], options);
}
