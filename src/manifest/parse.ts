import { MANIFEST_FILE_NAME, type SkillsManifest, type SourceDefinition } from "../schema.js";
import { isRecord } from "../validation/types.js";
import { ManifestError } from "./errors.js";
import { parseSkillObject, parseSkillString } from "./skills.js";
import { parseSourceDefinition } from "./sources.js";

function parseWorkflowString(value: string, path: string) {
  const separatorIndex = value.indexOf(":");

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new ManifestError(`${path} must use source:path format.`);
  }

  return {
    source: value.slice(0, separatorIndex),
    path: value.slice(separatorIndex + 1)
  };
}

function parseWorkflowObject(value: Record<string, unknown>, path: string) {
  if (typeof value.source !== "string" || value.source.trim() === "") {
    throw new ManifestError(`${path}.source must be a non-empty string.`);
  }

  if (typeof value.path !== "string" || value.path.trim() === "") {
    throw new ManifestError(`${path}.path must be a non-empty string.`);
  }

  if (value.alias !== undefined && (typeof value.alias !== "string" || value.alias.trim() === "")) {
    throw new ManifestError(`${path}.alias must be a non-empty string when provided.`);
  }

  return {
    source: value.source,
    path: value.path,
    ...(value.alias ? { alias: value.alias } : {})
  };
}

export function parseManifest(value: unknown): SkillsManifest {
  if (!isRecord(value)) {
    throw new ManifestError(`${MANIFEST_FILE_NAME} must contain a JSON object.`);
  }

  if (!Array.isArray(value.skills)) {
    throw new ManifestError("skills must be an array.");
  }

  const sources: Record<string, SourceDefinition> = {};
  const workflowSources: Record<string, SourceDefinition> = {};
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

    if (isRecord(value.sources.workflows)) {
      for (const [name, source] of Object.entries(value.sources.workflows)) {
        if (name.trim() === "") {
          throw new ManifestError("workflow source names must be non-empty strings.");
        }

        workflowSources[name] = parseSourceDefinition(source, `sources.workflows.${name}`);
      }
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

  const workflow = value.workflow === undefined
    ? undefined
    : typeof value.workflow === "string"
      ? parseWorkflowString(value.workflow, "workflow")
      : isRecord(value.workflow)
        ? parseWorkflowObject(value.workflow, "workflow")
        : undefined;

  if (value.workflow !== undefined && workflow === undefined) {
    throw new ManifestError("workflow must be a string or an object when provided.");
  }

  return {
    ...(Object.keys(sources).length > 0 ? { sources } : {}),
    ...(Object.keys(workflowSources).length > 0 ? { workflowSources } : {}),
    ...(workflow ? { workflow } : {}),
    skills
  };
}
