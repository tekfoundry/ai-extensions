import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { AixError } from "../errors.js";
import { parseRoleFrontMatter } from "./front-matter.js";
import type { DiscoveredRole, ParsedRoleFile } from "./types.js";
import { assertRoleContract, assertRoleFileNameMatches, buildParsedRole } from "./validation.js";

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

function discoverFromDirectory(root: string, directory: string, roles: DiscoveredRole[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      discoverFromDirectory(root, path, roles);
      continue;
    }

    if (!entry.isFile() || extname(entry.name) !== ".md") {
      continue;
    }

    const role = parseRoleFileFromPath(path);
    roles.push({
      path: relative(root, path),
      name: role.name,
      description: role.description
    });
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
