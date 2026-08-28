import { basename, dirname } from "node:path";
import { AixError } from "../errors.js";
import type { ParsedRoleFile, RoleMetadataValue, RoleRuntimeHints } from "./types.js";

const ROLE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROLE_CONTRACT_SECTIONS = [
  "purpose",
  "when to use",
  "context to inspect",
  "skills to consider",
  "stop conditions",
  "expected output"
];

function requireStringField(metadata: Record<string, RoleMetadataValue>, field: string, path: string): string {
  const value = metadata[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AixError(`Invalid role file: ${path} front matter must declare a non-empty ${field}.`);
  }

  return value.trim();
}

function optionalString(metadata: Record<string, RoleMetadataValue>, field: string, path: string): string | undefined {
  const value = metadata[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new AixError(`Invalid role file: ${path} front matter ${field} must be a non-empty string when provided.`);
  }

  return value.trim();
}

function optionalStringOrList(metadata: Record<string, RoleMetadataValue>, field: string, path: string): string | string[] | undefined {
  const value = metadata[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "")) {
    return value.map((item) => String(item).trim());
  }

  throw new AixError(`Invalid role file: ${path} front matter ${field} must be a string or string list when provided.`);
}

function optionalStringList(metadata: Record<string, RoleMetadataValue>, field: string, path: string): string[] | undefined {
  const value = metadata[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return [value.trim()];
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "")) {
    return value.map((item) => String(item).trim());
  }

  throw new AixError(`Invalid role file: ${path} front matter ${field} must be a string or string list when provided.`);
}

function optionalNumber(metadata: Record<string, RoleMetadataValue>, field: string, path: string): number | undefined {
  const value = metadata[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AixError(`Invalid role file: ${path} front matter ${field} must be a positive integer when provided.`);
  }

  return value;
}

export function assertRoleName(name: string, label = "role name"): void {
  if (name.includes(":")) {
    throw new AixError(`Invalid ${label}: ${name} must not contain ":".`);
  }

  if (!ROLE_NAME_PATTERN.test(name)) {
    throw new AixError(`Invalid ${label}: ${name} must use lowercase letters, numbers, and hyphens.`);
  }
}

export function assertRoleFileNameMatches(role: ParsedRoleFile, filePath: string): void {
  const expectedName = basename(filePath) === "ROLE.md"
    ? basename(dirname(filePath))
    : basename(filePath, ".md");

  if (expectedName !== role.name) {
    throw new AixError(`Invalid role file: ${filePath} name ${role.name} must match role bundle name ${expectedName}.`);
  }
}

export function roleRuntimeHints(metadata: Record<string, RoleMetadataValue>, path: string): RoleRuntimeHints {
  const tools = optionalStringOrList(metadata, "tools", path);
  const disallowedTools = optionalStringOrList(metadata, "disallowedTools", path);
  const model = optionalString(metadata, "model", path);
  const maxTurns = optionalNumber(metadata, "maxTurns", path);
  const skills = optionalStringList(metadata, "skills", path);
  const color = optionalString(metadata, "color", path);

  if (skills) {
    for (const skill of skills) {
      assertRoleName(skill, "role skill reference");
    }
  }

  return {
    ...(tools ? { tools } : {}),
    ...(disallowedTools ? { disallowedTools } : {}),
    ...(model ? { model } : {}),
    ...(maxTurns ? { maxTurns } : {}),
    ...(skills ? { skills } : {}),
    ...(color ? { color } : {})
  };
}

export function buildParsedRole(
  metadata: Record<string, RoleMetadataValue>,
  body: string,
  path = "role file"
): ParsedRoleFile {
  const name = requireStringField(metadata, "name", path);
  const description = requireStringField(metadata, "description", path);

  assertRoleName(name);

  if (body.trim() === "") {
    throw new AixError(`Invalid role file: ${path} must include an operating prompt body.`);
  }

  return {
    name,
    description,
    body,
    frontMatter: metadata,
    hints: roleRuntimeHints(metadata, path)
  };
}

export function roleContractIssues(role: ParsedRoleFile): string[] {
  const headings = new Set(
    role.body
      .split("\n")
      .map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim().toLowerCase())
      .filter((heading): heading is string => Boolean(heading))
      .map((heading) => heading.replace(/[^\w\s-]/g, "").replace(/\s+/g, " "))
  );

  return ROLE_CONTRACT_SECTIONS
    .filter((section) => !headings.has(section))
    .map((section) => `Role ${role.name} is missing required section: ${section}.`);
}

export function assertRoleContract(role: ParsedRoleFile): void {
  const issues = roleContractIssues(role);

  if (issues.length > 0) {
    throw new AixError(issues.join("\n"));
  }
}
