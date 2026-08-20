import type { SkillRequest } from "../schema.js";
import { ManifestError } from "./errors.js";
import { optionalString, requireString } from "./strings.js";

export function parseSkillString(value: string, path: string): SkillRequest {
  const separatorIndex = value.indexOf(":");

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new ManifestError(`${path} must use "source:path" format.`);
  }

  const source = value.slice(0, separatorIndex).trim();
  const skillPath = value.slice(separatorIndex + 1).trim();

  if (!source || !skillPath) {
    throw new ManifestError(`${path} must use "source:path" format.`);
  }

  return {
    source,
    path: skillPath
  };
}

export function parseSkillObject(skill: Record<string, unknown>, path: string): SkillRequest {
  const alias = optionalString(skill.alias, `${path}.alias`);
  const ref = optionalString(skill.ref, `${path}.ref`);

  return {
    source: requireString(skill.source, `${path}.source`),
    path: requireString(skill.path, `${path}.path`),
    ...(alias ? { alias } : {}),
    ...(ref ? { ref } : {})
  };
}
