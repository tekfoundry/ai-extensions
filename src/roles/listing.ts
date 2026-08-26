import { AixError } from "../errors.js";
import { readLockfileJson } from "../activation/lockfile.js";
import {
  loadRoleSourceDefinitions,
  readRoleSourceMetadata,
  resolveSourceFromDefinitions,
  writeSourceMetadata
} from "../sources/index.js";
import { discoverRoles } from "./discovery.js";
import type { DiscoveredRole } from "./types.js";

export interface ListedRole {
  path: string;
  name: string;
  description: string;
  installCommand: string;
}

interface ListSourceRolesOptions {
  missingOnly?: boolean;
}

function roleRows(sourceName: string, roles: DiscoveredRole[]): ListedRole[] {
  return roles.map((role) => ({
    ...role,
    installCommand: `aix role activate ${sourceName}/${role.path}`
  }));
}

function renderListedRoles(sourceName: string, roles: DiscoveredRole[], options: ListSourceRolesOptions): ListedRole[] {
  const lockfile = readLockfileJson();
  const rows = options.missingOnly
    ? roles.filter((candidate) => !(lockfile.roles || []).some(
      (role) => role.source === sourceName && role.sourcePath === candidate.path
    ))
    : roles;

  return roleRows(sourceName, rows);
}

export function listSourceRoles(sourceName: string, options: ListSourceRolesOptions = {}): ListedRole[] {
  const sources = loadRoleSourceDefinitions();
  const definition = sources[sourceName];

  if (!definition) {
    throw new AixError(`Unknown role source: ${sourceName}`);
  }

  const metadata = readRoleSourceMetadata(sourceName, definition);

  if (metadata) {
    return renderListedRoles(sourceName, metadata.roles, options);
  }

  const resolved = resolveSourceFromDefinitions(sourceName, sources);
  const roles = discoverRoles(resolved.rootPath);

  writeSourceMetadata({
    source: sourceName,
    kind: "role",
    sourceType: "git",
    sourceUrl: definition.url,
    requestedRef: definition.ref,
    resolvedCommit: resolved.resolvedCommit,
    sourcePath: definition.path,
    roles
  });

  return renderListedRoles(sourceName, roles, options);
}
