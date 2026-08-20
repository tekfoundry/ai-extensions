import type { SkillManifestEntry, SkillRequest, SourceDefinition } from "../schema.js";

export function getDefaultSources(): Record<string, SourceDefinition> {
  return {
    aix: {
      type: "git",
      url: process.env.AIX_SOURCE_AIX_URL || "https://github.com/tekfoundry/ai-extensions.git",
      path: process.env.AIX_SOURCE_AIX_PATH || "aix/skills",
      ref: process.env.AIX_SOURCE_AIX_REF || "master"
    },
    mattpocock: {
      type: "git",
      url: process.env.AIX_SOURCE_MATTPOCOCK_URL || "https://github.com/mattpocock/skills.git",
      path: process.env.AIX_SOURCE_MATTPOCOCK_PATH || "skills",
      ref: process.env.AIX_SOURCE_MATTPOCOCK_REF || "main"
    },
    "cursor-pstack": {
      type: "git",
      url: process.env.AIX_SOURCE_CURSOR_PSTACK_URL || "https://github.com/cursor/plugins.git",
      path: process.env.AIX_SOURCE_CURSOR_PSTACK_PATH || "pstack/skills",
      ref: process.env.AIX_SOURCE_CURSOR_PSTACK_REF || "main"
    }
  };
}

export function getDefaultWorkflowSources(): Record<string, SourceDefinition> {
  return {
    aix: {
      type: "git",
      url: process.env.AIX_SOURCE_AIX_URL || "https://github.com/tekfoundry/ai-extensions.git",
      path: process.env.AIX_SOURCE_AIX_WORKFLOW_PATH || "aix/workflows/design-plan-execute",
      ref: process.env.AIX_SOURCE_AIX_REF || "master"
    }
  };
}

export function createSkillRequest(source: string, path: string): SkillRequest {
  return { source, path };
}

export function createSkillManifestEntry(source: string, path: string): SkillManifestEntry {
  return `${source}:${path}`;
}
