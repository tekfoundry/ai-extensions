import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readLockfileJson } from "../activation/lockfile.js";
import { AixError } from "../errors.js";
import { AGENTS_DIR } from "../paths/agents.js";
import type { LockfileWorkflowEntry } from "../schema.js";
import { gitNoIndexDiff } from "./diff.js";

const SECTION_PREFIX = "sections/";

export interface PublishedWorkflowTemplate {
  name: string;
  kind: "document" | "section";
  originPath: string;
  publishedPath: string;
  published: boolean;
}

export interface ListWorkflowTemplatesResult {
  workflowName: string;
  templates: PublishedWorkflowTemplate[];
}

export interface PublishWorkflowTemplatesResult {
  workflowName: string;
  published: PublishedWorkflowTemplate[];
  unchanged: PublishedWorkflowTemplate[];
}

export interface DiffWorkflowTemplatesResult {
  workflowName: string;
  diffs: Array<{
    name: string;
    diff: string;
  }>;
}

export interface ResetWorkflowTemplateResult {
  workflowName: string;
  template: PublishedWorkflowTemplate;
}

export interface ResetAllWorkflowTemplatesResult {
  workflowName: string;
  reset: PublishedWorkflowTemplate[];
}

function activeWorkflow(): LockfileWorkflowEntry {
  const workflow = readLockfileJson().workflows?.[0];

  if (!workflow) {
    throw new AixError("No active workflow is installed.");
  }

  return workflow;
}

function publishedTemplatePath(templatePath: string): string {
  const relativeTemplatePath = templatePath.replace(/^templates\//, "");

  return join(AGENTS_DIR, "templates", relativeTemplatePath);
}

function templateNameFromPath(templatePath: string): string {
  return templatePath
    .replace(/^templates\//, "")
    .replace(/\.md$/, "");
}

function templateKindFromPath(templatePath: string): PublishedWorkflowTemplate["kind"] {
  return templateNameFromPath(templatePath).startsWith(SECTION_PREFIX) ? "section" : "document";
}

function workflowTemplateRows(workflow: LockfileWorkflowEntry): PublishedWorkflowTemplate[] {
  return (workflow.templates || [])
    .map((template) => {
      const originPath = join(workflow.packagePath, template.path);
      const publishedPath = publishedTemplatePath(template.path);

      return {
        name: templateNameFromPath(template.path),
        kind: templateKindFromPath(template.path),
        originPath,
        publishedPath,
        published: existsSync(publishedPath)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function findTemplate(workflow: LockfileWorkflowEntry, name: string): PublishedWorkflowTemplate {
  const normalizedName = name.replace(/\.md$/, "");
  const template = workflowTemplateRows(workflow).find((candidate) => candidate.name === normalizedName);

  if (!template) {
    throw new AixError(`Unknown workflow template: ${name}`);
  }

  return template;
}

function removePublishedTemplate(path: string): void {
  unlinkSync(path);
}

function removeEmptyTemplateParents(path: string, stopAt: string): void {
  let current = dirname(path);

  while (current.startsWith(stopAt) && current !== stopAt) {
    try {
      rmSync(current);
    } catch {
      return;
    }

    current = dirname(current);
  }
}

function writePublishedTemplate(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

export function listWorkflowTemplates(): ListWorkflowTemplatesResult {
  const workflow = activeWorkflow();

  return {
    workflowName: workflow.name,
    templates: workflowTemplateRows(workflow)
  };
}

export function publishWorkflowTemplates(): PublishWorkflowTemplatesResult {
  const workflow = activeWorkflow();
  const published: PublishedWorkflowTemplate[] = [];
  const unchanged: PublishedWorkflowTemplate[] = [];

  for (const template of workflowTemplateRows(workflow)) {
    if (!existsSync(template.originPath)) {
      throw new AixError(`Workflow template origin is missing: ${template.originPath}`);
    }

    const origin = readFileSync(template.originPath, "utf8");

    if (existsSync(template.publishedPath)) {
      const existing = readFileSync(template.publishedPath, "utf8");

      if (existing !== origin) {
        throw new AixError(`Refusing to overwrite locally edited published template: ${template.publishedPath}`);
      }

      unchanged.push({ ...template, published: true });
      continue;
    }

    writePublishedTemplate(template.publishedPath, origin);
    published.push({ ...template, published: true });
  }

  return {
    workflowName: workflow.name,
    published,
    unchanged
  };
}

export function diffWorkflowTemplates(name?: string): DiffWorkflowTemplatesResult {
  const workflow = activeWorkflow();
  const templates = name ? [findTemplate(workflow, name)] : workflowTemplateRows(workflow);
  const diffs = templates
    .filter((template) => existsSync(template.publishedPath))
    .map((template) => ({
      name: template.name,
      diff: gitNoIndexDiff(template.originPath, template.publishedPath)
    }))
    .filter((template) => template.diff.trim() !== "");

  return {
    workflowName: workflow.name,
    diffs
  };
}

export function resetWorkflowTemplate(name: string): ResetWorkflowTemplateResult {
  const workflow = activeWorkflow();
  const template = findTemplate(workflow, name);

  if (!existsSync(template.publishedPath)) {
    throw new AixError(`Published workflow template does not exist: ${template.name}`);
  }

  removePublishedTemplate(template.publishedPath);
  removeEmptyTemplateParents(template.publishedPath, join(AGENTS_DIR, "templates"));

  return {
    workflowName: workflow.name,
    template: { ...template, published: false }
  };
}

export function resetAllWorkflowTemplates(): ResetAllWorkflowTemplatesResult {
  const workflow = activeWorkflow();
  const reset: PublishedWorkflowTemplate[] = [];
  const templatesDir = join(AGENTS_DIR, "templates");

  for (const template of workflowTemplateRows(workflow)) {
    if (!existsSync(template.publishedPath)) {
      continue;
    }

    removePublishedTemplate(template.publishedPath);
    removeEmptyTemplateParents(template.publishedPath, templatesDir);
    reset.push({ ...template, published: false });
  }

  return {
    workflowName: workflow.name,
    reset
  };
}
