import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { AixError } from "../errors.js";
import { roleEntrypointPath, roleGuidancePath } from "../paths/agents.js";
import { parseRoleFrontMatter } from "./front-matter.js";
import type { DiscoveredRole, ParsedRoleFile, ParsedRoleGuidanceFile } from "./types.js";
import { assertRoleContract, assertRoleFileNameMatches, buildParsedRole, parseAndValidateRoleGuidanceFile } from "./validation.js";

export function parseRoleFile(markdown: string, path = "role file"): ParsedRoleFile {
  const parsed = parseRoleFrontMatter(markdown, path);

  return buildParsedRole(parsed.metadata, parsed.body, path);
}

export function parseRoleFileFromPath(path: string, options: { requireContract?: boolean } = {}): ParsedRoleFile {
  if (!existsSync(path)) {
    throw new AixError(`Missing role file: ${path}`);
  }

  const role = parseRoleFile(readFileSync(path, "utf8"), path);
  assertRoleFileNameMatches(role, path);

  if (options.requireContract) {
    assertRoleContract(role);
  }

  return role;
}

export function parseRoleGuidanceFile(markdown: string, path = "role guidance file"): ParsedRoleGuidanceFile {
  const parsed = parseRoleFrontMatter(markdown, path);

  return parseAndValidateRoleGuidanceFile(parsed.metadata, parsed.body, path);
}

export function parseRoleGuidanceFileFromPath(path: string): ParsedRoleGuidanceFile {
  if (!existsSync(path)) {
    throw new AixError(`Missing role guidance file: ${path}`);
  }

  return parseRoleGuidanceFile(readFileSync(path, "utf8"), path);
}

export function assertBundledRoleGuidance(rolePath: string): void {
  parseRoleGuidanceFileFromPath(roleGuidancePath(rolePath));
}

function discoverFromDirectory(root: string, directory: string, roles: DiscoveredRole[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      const entrypointPath = roleEntrypointPath(path);

      if (existsSync(entrypointPath)) {
        const role = parseRoleFileFromPath(entrypointPath);
        roles.push({
          path: relative(root, path),
          name: role.name,
          description: role.description
        });
      } else {
        discoverFromDirectory(root, path, roles);
      }
      continue;
    }
  }
}

export function discoverRoles(root: string): DiscoveredRole[] {
  if (!existsSync(root)) {
    throw new AixError(`Missing role source path: ${root}`);
  }

  const roles: DiscoveredRole[] = [];

  discoverFromDirectory(root, root, roles);

  return roles.sort((a, b) => a.path.localeCompare(b.path));
}
