export type RoleMetadataScalar = string | number | boolean;
export type RoleMetadataValue = RoleMetadataScalar | RoleMetadataScalar[];

export interface RoleRuntimeHints {
  tools?: string | string[];
  disallowedTools?: string | string[];
  model?: string;
  maxTurns?: number;
  skills?: string[];
  color?: string;
}

export interface ParsedRoleFile {
  name: string;
  description: string;
  body: string;
  frontMatter: Record<string, RoleMetadataValue>;
  hints: RoleRuntimeHints;
}

export interface ParsedRoleGuidanceFile {
  body: string;
  frontMatter: Record<string, RoleMetadataValue>;
  usesGuidance: string[];
}

export interface DiscoveredRole {
  path: string;
  name: string;
  description: string;
}
