import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { hashFile } from "../fs/hashing.js";
import type { FileHash, LockfileWorkflowEntry } from "../schema.js";
import type { WorkflowManifestFile } from "./types.js";

const TEMPLATE_EXTENSION = ".md";
const SECTION_PREFIX = "sections/";
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const UNSUPPORTED_KEYWORDS = /^(for|endfor|if|endif|else|elseif|unless|endunless)\b/;

export interface WorkflowTemplate {
  kind: "document" | "section";
  name: string;
  sourcePath: string;
  absolutePath: string;
  contents: string;
}

export interface WorkflowTemplateSet {
  templatesDir?: string;
  documents: WorkflowTemplate[];
  sections: WorkflowTemplate[];
}

export interface WorkflowTemplateReference {
  kind: "section" | "repeat" | "placeholder";
  value: string;
  section?: string;
}

export function workflowTemplateName(template: Pick<WorkflowTemplate, "kind" | "name">): string {
  return template.kind === "section" ? `${SECTION_PREFIX}${template.name}` : template.name;
}

function assertTemplateNameSafe(name: string, path: string): void {
  const segments = name.split("/");
  if (segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))) {
    throw new AixError(`Workflow template name contains unsafe characters at ${path}: ${name}`);
  }
}

function listTemplateFiles(directory: string, options: { excludeDirectories?: Set<string> } = {}): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (options.excludeDirectories?.has(entry.name)) {
        continue;
      }

      const childDirectory = join(directory, entry.name);
      for (const child of listTemplateFiles(childDirectory, options)) {
        files.push(join(entry.name, child));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(TEMPLATE_EXTENSION)) {
      files.push(entry.name);
    }
  }

  return files
    .map((file) => file.split("\\").join("/"))
    .sort((a, b) => a.localeCompare(b));
}

function readTemplate(kind: WorkflowTemplate["kind"], templatesRoot: string, templatesDir: string, relativePath: string): WorkflowTemplate {
  const absolutePath = join(templatesRoot, relativePath);
  const name = relativePath.slice(0, -TEMPLATE_EXTENSION.length).replace(/^sections\//, "");

  assertTemplateNameSafe(name, absolutePath);

  return {
    kind,
    name,
    sourcePath: join(templatesDir, relativePath),
    absolutePath,
    contents: readFileSync(absolutePath, "utf8")
  };
}

export function discoverWorkflowTemplates(workflow: WorkflowManifestFile, packagePath: string): WorkflowTemplateSet {
  if (!workflow.templatesDir) {
    return { documents: [], sections: [] };
  }

  const templatesRoot = join(packagePath, workflow.templatesDir);
  if (!existsSync(templatesRoot)) {
    throw new AixError(`Workflow templates directory is missing from package: ${templatesRoot}`);
  }

  const documents = listTemplateFiles(templatesRoot, { excludeDirectories: new Set(["sections"]) })
    .map((file) => readTemplate("document", templatesRoot, workflow.templatesDir!, file));
  const sectionsRoot = join(templatesRoot, "sections");
  const sections = listTemplateFiles(sectionsRoot).map((file) => readTemplate("section", templatesRoot, workflow.templatesDir!, join("sections", file)));

  return {
    templatesDir: workflow.templatesDir,
    documents,
    sections
  };
}

export function parseWorkflowTemplateReferences(template: WorkflowTemplate): WorkflowTemplateReference[] {
  return [...template.contents.matchAll(PLACEHOLDER_PATTERN)].map((match) => {
    const expression = match[1].trim();
    const sectionMatch = /^section:([a-zA-Z0-9._-]+)$/.exec(expression);
    if (sectionMatch) {
      return { kind: "section", value: expression, section: sectionMatch[1] };
    }

    const repeatMatch = /^repeat:([a-zA-Z0-9._-]+(?:\.[a-zA-Z0-9._-]+)*)\s+section:([a-zA-Z0-9._-]+)$/.exec(expression);
    if (repeatMatch) {
      return { kind: "repeat", value: repeatMatch[1], section: repeatMatch[2] };
    }

    if (/^[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/.test(expression)) {
      return { kind: "placeholder", value: expression };
    }

    throw new AixError(`Unsupported template syntax in ${template.sourcePath}: {{ ${expression} }}`);
  });
}

export function validateWorkflowTemplates(templateSet: WorkflowTemplateSet): void {
  const sectionNames = new Set(templateSet.sections.map((section) => section.name));

  for (const template of [...templateSet.documents, ...templateSet.sections]) {
    for (const match of template.contents.matchAll(PLACEHOLDER_PATTERN)) {
      const expression = match[1].trim();
      if (UNSUPPORTED_KEYWORDS.test(expression) || expression.includes("|")) {
        throw new AixError(`Unsupported template syntax in ${template.sourcePath}: {{ ${expression} }}`);
      }
    }

    for (const reference of parseWorkflowTemplateReferences(template)) {
      if ((reference.kind === "section" || reference.kind === "repeat") && reference.section && !sectionNames.has(reference.section)) {
        throw new AixError(`Workflow template ${template.sourcePath} references missing section: ${reference.section}`);
      }
    }
  }
}

export function workflowTemplateHashes(templateSet: WorkflowTemplateSet): FileHash[] {
  return [...templateSet.documents, ...templateSet.sections].map((template) => ({
    path: template.sourcePath,
    sha256: hashFile(template.absolutePath)
  }));
}

export function workflowTemplateCount(workflow: Pick<LockfileWorkflowEntry, "templates">): number {
  return workflow.templates?.length || 0;
}

export function addWorkflowTemplateVerifyIssues(issues: string[], workflow: LockfileWorkflowEntry): void {
  for (const template of workflow.templates || []) {
    const path = join(workflow.packagePath, template.path);
    if (!existsSync(path)) {
      issues.push(`Workflow template is missing: ${path}`);
    } else if (hashFile(path) !== template.sha256) {
      issues.push(`Workflow template hash changed: ${path}`);
    }
  }
}

export function assertWorkflowTemplatesUnmodified(workflow: LockfileWorkflowEntry): void {
  for (const template of workflow.templates || []) {
    const path = join(workflow.packagePath, template.path);
    if (existsSync(path) && hashFile(path) !== template.sha256) {
      throw new AixError(`Refusing to remove modified workflow template: ${path}`);
    }
  }
}
