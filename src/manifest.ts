import { readFile } from "node:fs/promises";
import { MANIFEST_FILE_NAME, type SkillRequest, type SkillsManifest, type SourceDefinition } from "./schema.js";

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ManifestError(`${path} must be a non-empty string.`);
  }

  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, path);
}

function parseSourceDefinition(value: unknown, path: string): SourceDefinition {
  if (!isRecord(value)) {
    throw new ManifestError(`${path} must be an object.`);
  }

  const type = requireString(value.type, `${path}.type`);
  const sourcePath = optionalString(value.path, `${path}.path`);
  const ref = optionalString(value.ref, `${path}.ref`);

  if (type === "git") {
    return {
      type,
      url: requireString(value.url, `${path}.url`),
      ...(sourcePath ? { path: sourcePath } : {}),
      ...(ref ? { ref } : {})
    };
  }

  throw new ManifestError(`${path}.type must be "git".`);
}

function parseSkillString(value: string, path: string): SkillRequest {
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

function parseSkillObject(skill: Record<string, unknown>, path: string): SkillRequest {
  const alias = optionalString(skill.alias, `${path}.alias`);
  const ref = optionalString(skill.ref, `${path}.ref`);

  return {
    source: requireString(skill.source, `${path}.source`),
    path: requireString(skill.path, `${path}.path`),
    ...(alias ? { alias } : {}),
    ...(ref ? { ref } : {})
  };
}

export function parseManifest(value: unknown): SkillsManifest {
  if (!isRecord(value)) {
    throw new ManifestError(`${MANIFEST_FILE_NAME} must contain a JSON object.`);
  }

  if (!Array.isArray(value.skills)) {
    throw new ManifestError("skills must be an array.");
  }

  const sources: SkillsManifest["sources"] = {};
  if (value.sources !== undefined) {
    if (!isRecord(value.sources)) {
      throw new ManifestError("sources must be an object when provided.");
    }

    for (const [name, source] of Object.entries(value.sources)) {
      if (name.trim() === "") {
        throw new ManifestError("source names must be non-empty strings.");
      }

      sources[name] = parseSourceDefinition(source, `sources.${name}`);
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

export async function loadManifest(filePath = MANIFEST_FILE_NAME): Promise<SkillsManifest> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new ManifestError(`Missing ${filePath}.`);
    }

    throw error;
  }

  try {
    return parseManifest(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ManifestError(`Malformed JSON in ${filePath}: ${error.message}`);
    }

    throw error;
  }
}
