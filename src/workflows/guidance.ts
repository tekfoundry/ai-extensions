import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { hashFile } from "../fs/hashing.js";
import type { FileHash, LockfileWorkflowEntry } from "../schema.js";
import type { WorkflowManifestFile } from "./types.js";

const GUIDANCE_EXTENSION = ".md";
const ACTIVITY_PREFIX = "activities/";

type GuidanceKind = "shared" | "activity" | "readme";

export interface WorkflowGuidance {
  kind: GuidanceKind;
  name: string;
  sourcePath: string;
  absolutePath: string;
  contents: string;
  appliesTo: {
    roles: string[];
    skills: string[];
  };
}

export interface WorkflowGuidanceSet {
  guidanceDir?: string;
  documents: WorkflowGuidance[];
}

function assertGuidanceNameSafe(name: string, path: string): void {
  const segments = name.split("/");
  if (segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))) {
    throw new AixError(`Workflow guidance name contains unsafe characters at ${path}: ${name}`);
  }
}

function listGuidanceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listGuidanceFiles(path).map((file) => join(entry.name, file));
      }

      return entry.isFile() && entry.name.endsWith(GUIDANCE_EXTENSION) ? [entry.name] : [];
    })
    .map((file) => file.split("\\").join("/"))
    .sort((a, b) => a.localeCompare(b));
}

function parseListItem(line: string, path: string, lineNumber: number): string {
  const match = line.match(/^\s+-\s+(.+)$/);
  if (!match || match[1].trim() === "") {
    throw new AixError(`Invalid workflow guidance front matter at ${path}: expected list item on line ${lineNumber}.`);
  }

  return match[1].trim();
}

function parseAppliesTo(frontMatter: string, path: string): WorkflowGuidance["appliesTo"] {
  const appliesTo = { roles: [] as string[], skills: [] as string[] };
  const lines = frontMatter.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }

    if (line === "applies_to:") {
      index += 1;
      while (index < lines.length && /^  [A-Za-z][A-Za-z0-9_-]*:\s*$/.test(lines[index])) {
        const fieldMatch = lines[index].match(/^  ([A-Za-z][A-Za-z0-9_-]*):\s*$/);
        const field = fieldMatch?.[1];

        if (field !== "roles" && field !== "skills") {
          throw new AixError(`Invalid workflow guidance front matter at ${path}: applies_to.${field} is not supported.`);
        }

        index += 1;
        while (index < lines.length && /^    -\s+/.test(lines[index])) {
          appliesTo[field].push(parseListItem(lines[index], path, index + 1));
          index += 1;
        }
      }
      index -= 1;
      continue;
    }

    throw new AixError(`Invalid workflow guidance front matter at ${path}: expected applies_to on line ${index + 1}.`);
  }

  return appliesTo;
}

function parseWorkflowGuidanceFrontMatter(markdown: string, path: string): {
  appliesTo: WorkflowGuidance["appliesTo"];
  body: string;
} {
  const normalized = markdown.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return {
      appliesTo: { roles: [], skills: [] },
      body: normalized
    };
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex < 0) {
    throw new AixError(`Invalid workflow guidance file: ${path} is missing closing YAML front matter marker.`);
  }

  return {
    appliesTo: parseAppliesTo(normalized.slice(4, endIndex), path),
    body: normalized.slice(endIndex + "\n---\n".length)
  };
}

function guidanceKind(name: string): GuidanceKind {
  if (name === "README") {
    return "readme";
  }

  return name.startsWith(ACTIVITY_PREFIX) ? "activity" : "shared";
}

function readGuidance(guidanceRoot: string, guidanceDir: string, relativePath: string): WorkflowGuidance {
  const absolutePath = join(guidanceRoot, relativePath);
  const name = relativePath.slice(0, -GUIDANCE_EXTENSION.length);
  assertGuidanceNameSafe(name, absolutePath);

  const contents = readFileSync(absolutePath, "utf8");
  const parsed = parseWorkflowGuidanceFrontMatter(contents, absolutePath);

  if (parsed.body.trim() === "") {
    throw new AixError(`Invalid workflow guidance file: ${absolutePath} must include guidance content.`);
  }

  return {
    kind: guidanceKind(name),
    name,
    sourcePath: join(guidanceDir, relativePath),
    absolutePath,
    contents,
    appliesTo: parsed.appliesTo
  };
}

export function discoverWorkflowGuidance(workflow: WorkflowManifestFile, packagePath: string): WorkflowGuidanceSet {
  if (!workflow.guidanceDir) {
    return { documents: [] };
  }

  const guidanceRoot = join(packagePath, workflow.guidanceDir);
  if (!existsSync(guidanceRoot)) {
    throw new AixError(`Workflow guidance directory is missing from package: ${guidanceRoot}`);
  }

  return {
    guidanceDir: workflow.guidanceDir,
    documents: listGuidanceFiles(guidanceRoot).map((file) => readGuidance(guidanceRoot, workflow.guidanceDir!, file))
  };
}

export function validateWorkflowGuidance(guidanceSet: WorkflowGuidanceSet): void {
  if (!guidanceSet.guidanceDir) {
    return;
  }

  const names = new Set(guidanceSet.documents.map((document) => document.name));
  const required = ["README", "shared", "activities/planning", "activities/implementation", "activities/verification", "activities/review", "activities/documentation"];

  for (const name of required) {
    if (!names.has(name)) {
      throw new AixError(`Workflow guidance is missing required document: ${guidanceSet.guidanceDir}/${name}.md`);
    }
  }
}

export function workflowGuidanceHashes(guidanceSet: WorkflowGuidanceSet): FileHash[] {
  return guidanceSet.documents.map((document) => ({
    path: document.sourcePath,
    sha256: hashFile(document.absolutePath)
  }));
}

export function workflowGuidanceCount(workflow: Pick<LockfileWorkflowEntry, "guidance">): number {
  return workflow.guidance?.length || 0;
}

export function addWorkflowGuidanceVerifyIssues(issues: string[], workflow: LockfileWorkflowEntry): void {
  for (const guidance of workflow.guidance || []) {
    const path = join(workflow.packagePath, guidance.path);
    if (!existsSync(path)) {
      issues.push(`Workflow guidance is missing: ${path}`);
    } else if (hashFile(path) !== guidance.sha256) {
      issues.push(`Workflow guidance hash changed: ${path}`);
    }
  }
}
