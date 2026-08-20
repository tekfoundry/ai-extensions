import type { SourceDefinition } from "../schema.js";
import type { ResolvedSource } from "../sources/index.js";

export interface SkillSource {
  source: string;
  resolvedSource: ResolvedSource;
  sourcePath: string;
}

export interface InitResult {
  declaredCount: number;
  materializedCount: number;
  activatedCount: number;
  manifestPath: string;
  lockfilePath: string;
}

export interface InitOptions {
  sources?: Record<string, SourceDefinition>;
  workflowSources?: Record<string, SourceDefinition>;
  cacheRoot?: string;
}
