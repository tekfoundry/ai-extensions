import { MANIFEST_FILE_NAME, type SkillsManifest, type SourceDefinition } from "../schema.js";
import { isRecord } from "../validation/types.js";
import { ManifestError } from "./errors.js";
import { parseSkillObject, parseSkillString } from "./skills.js";
import { parseSourceDefinition } from "./sources.js";

export function parseManifest(value: unknown): SkillsManifest {
  if (!isRecord(value)) {
    throw new ManifestError(`${MANIFEST_FILE_NAME} must contain a JSON object.`);
  }

  if (!Array.isArray(value.skills)) {
    throw new ManifestError("skills must be an array.");
  }

  const sources: Record<string, SourceDefinition> = {};
  if (value.sources !== undefined) {
    if (!isRecord(value.sources)) {
      throw new ManifestError("sources must be an object when provided.");
    }

    if (value.sources.skills !== undefined && !isRecord(value.sources.skills)) {
      throw new ManifestError("sources.skills must be an object when provided.");
    }

    const skillSources = isRecord(value.sources.skills) ? value.sources.skills : value.sources;
    const sourcePathPrefix = isRecord(value.sources.skills) ? "sources.skills" : "sources";

    for (const [name, source] of Object.entries(skillSources)) {
      if (name.trim() === "") {
        throw new ManifestError("source names must be non-empty strings.");
      }

      sources[name] = parseSourceDefinition(source, `${sourcePathPrefix}.${name}`);
    }
  }

  const skills = value.skills.map((skill, index) => {
    const path = `skills[${index}]`;
    if (typeof skill === "string") {
      return parseSkillString(skill, path);
    }

    if (!isRecord(skill)) {
      throw new ManifestError(`${path} must be a string or an object.`);
    }

    return parseSkillObject(skill, path);
  });

  return {
    ...(Object.keys(sources).length > 0 ? { sources } : {}),
    skills
  };
}
