import type { SourceDefinition } from "../schema.js";

export interface ResolvedSource {
  name: string;
  definition: SourceDefinition;
  rootPath: string;
  resolvedCommit?: string;
}

export interface NamedSourceDefinition {
  name: string;
  definition: SourceDefinition;
}

export interface SourceMetadataSkill {
  path: string;
  name: string;
}

export interface SourceMetadata {
  source: string;
  kind: "skill";
  sourceType: "git";
  sourceUrl: string;
  requestedRef?: string;
  resolvedCommit?: string;
  sourcePath?: string;
  skills: SourceMetadataSkill[];
}
