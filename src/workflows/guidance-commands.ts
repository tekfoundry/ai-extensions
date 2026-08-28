import { existsSync, mkdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readLockfileJson } from "../activation/lockfile.js";
import { AixError } from "../errors.js";
import { hashFile } from "../fs/hashing.js";
import { AGENTS_DIR } from "../paths/agents.js";
import { parseRoleGuidanceFileFromPath } from "../roles/discovery.js";
import type { LockfileRoleEntry, LockfileWorkflowEntry } from "../schema.js";
import { gitNoIndexDiff } from "./diff.js";
import { parseWorkflowGuidanceMarkdown } from "./guidance.js";

type GuidanceKind = "shared" | "activity" | "role";
type GuidanceOwnerKind = "workflow" | "role";

export interface ActiveGuidanceDocument {
  name: string;
  kind: GuidanceKind;
  origin: string;
  status: "origin" | "editable" | "modified" | "missing";
  metadata: string;
  originPath: string;
  editablePath: string;
  ownerKind: GuidanceOwnerKind;
}

export interface GuidanceCommandResult {
  workflowName: string;
}

export interface ListGuidanceResult extends GuidanceCommandResult {
  guidance: ActiveGuidanceDocument[];
}

export interface PublishGuidanceResult extends GuidanceCommandResult {
  published: ActiveGuidanceDocument[];
  unchanged: ActiveGuidanceDocument[];
  alreadyEditableRoles: ActiveGuidanceDocument[];
}

export interface DiffGuidanceCommandsResult extends GuidanceCommandResult {
  commands: string[];
}

export interface DiffGuidanceResult extends GuidanceCommandResult {
  name: string;
  diff: string;
}

export interface ResetGuidanceResult extends GuidanceCommandResult {
  guidance: ActiveGuidanceDocument;
}

export interface ResetAllGuidancePreviewResult extends GuidanceCommandResult {
  guidance: ActiveGuidanceDocument[];
}

export interface ResetAllGuidanceResult extends GuidanceCommandResult {
  reset: ActiveGuidanceDocument[];
}

function activeWorkflow(): LockfileWorkflowEntry {
  const workflow = readLockfileJson().workflows?.[0];

  if (!workflow) {
    throw new AixError("No active workflow is installed.");
  }

  return workflow;
}

function workflowGuidanceName(guidancePath: string): string {
  return guidancePath.replace(/^guidance\//, "").replace(/\.md$/, "");
}

function workflowGuidanceEditablePath(guidancePath: string): string {
  return join(AGENTS_DIR, "guidance", guidancePath.replace(/^guidance\//, ""));
}

function workflowGuidanceKind(name: string): GuidanceKind | undefined {
  if (name === "shared") {
    return "shared";
  }

  return name.startsWith("activities/") ? "activity" : undefined;
}

function formatAppliesTo(path: string): string {
  if (!existsSync(path)) {
    return "";
  }

  const parsed = parseWorkflowGuidanceMarkdown(readFileSync(path, "utf8"), path);
  const values = [
    ...parsed.appliesTo.roles.map((role) => `role:${role}`),
    ...parsed.appliesTo.skills.map((skill) => `skill:${skill}`)
  ];

  return values.join(",");
}

function formatUsesGuidance(path: string): string {
  if (!existsSync(path)) {
    return "";
  }

  return parseRoleGuidanceFileFromPath(path).usesGuidance.join(",");
}

function guidanceStatus(originPath: string, editablePath: string, originOnlyStatus: ActiveGuidanceDocument["status"]): ActiveGuidanceDocument["status"] {
  if (!existsSync(editablePath)) {
    return originOnlyStatus;
  }

  if (!existsSync(originPath)) {
    return "missing";
  }

  return hashFile(originPath) === hashFile(editablePath) ? "editable" : "modified";
}

function workflowGuidanceRows(workflow: LockfileWorkflowEntry): ActiveGuidanceDocument[] {
  return (workflow.guidance || [])
    .map((file): ActiveGuidanceDocument | undefined => {
      const name = workflowGuidanceName(file.path);
      const kind = workflowGuidanceKind(name);

      if (!kind) {
        return undefined;
      }

      const originPath = join(workflow.packagePath, file.path);
      const editablePath = workflowGuidanceEditablePath(file.path);

      return {
        name,
        kind,
        origin: `workflow:${workflow.source}/${workflow.name}`,
        status: guidanceStatus(originPath, editablePath, "origin"),
        metadata: formatAppliesTo(existsSync(editablePath) ? editablePath : originPath),
        originPath,
        editablePath,
        ownerKind: "workflow" as const
      };
    })
    .filter((row): row is ActiveGuidanceDocument => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function roleOrigin(entry: LockfileRoleEntry): string {
  return entry.owner?.kind === "workflow" ? `role:workflow/${entry.owner.name}` : `role:${entry.source}`;
}

function roleGuidanceRows(roles: LockfileRoleEntry[] = []): ActiveGuidanceDocument[] {
  return roles
    .map((role) => {
      const originPath = join(role.packagePath, "GUIDANCE.md");
      const editablePath = join(role.activationPath, "GUIDANCE.md");

      return {
        name: `roles/${role.activeName}`,
        kind: "role" as const,
        origin: roleOrigin(role),
        status: guidanceStatus(originPath, editablePath, "missing"),
        metadata: formatUsesGuidance(existsSync(editablePath) ? editablePath : originPath),
        originPath,
        editablePath,
        ownerKind: "role" as const
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function allGuidanceRows(): { workflow: LockfileWorkflowEntry; rows: ActiveGuidanceDocument[] } {
  const lockfile = readLockfileJson();
  const workflow = lockfile.workflows?.[0];

  if (!workflow) {
    throw new AixError("No active workflow is installed.");
  }

  return {
    workflow,
    rows: [...workflowGuidanceRows(workflow), ...roleGuidanceRows(lockfile.roles || [])].sort((left, right) => left.name.localeCompare(right.name))
  };
}

function findGuidance(name: string): { workflow: LockfileWorkflowEntry; guidance: ActiveGuidanceDocument } {
  const normalizedName = name.replace(/\.md$/, "");
  const { workflow, rows } = allGuidanceRows();
  const guidance = rows.find((row) => row.name === normalizedName);

  if (!guidance) {
    throw new AixError(`Unknown guidance document: ${name}`);
  }

  return { workflow, guidance };
}

function writeEditableGuidance(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

function removeEmptyGuidanceParents(path: string): void {
  const stopAt = join(AGENTS_DIR, "guidance");
  let current = dirname(path);

  while (current.startsWith(stopAt) && current !== stopAt) {
    try {
      rmdirSync(current);
    } catch {
      return;
    }

    current = dirname(current);
  }

  try {
    rmdirSync(stopAt);
  } catch {
    return;
  }
}

function resetGuidanceDocument(guidance: ActiveGuidanceDocument): ActiveGuidanceDocument {
  if (guidance.ownerKind === "workflow") {
    if (!existsSync(guidance.editablePath)) {
      throw new AixError(`Workflow guidance override does not exist: ${guidance.name}`);
    }

    unlinkSync(guidance.editablePath);
    removeEmptyGuidanceParents(guidance.editablePath);
    return { ...guidance, status: "origin" };
  }

  if (!existsSync(guidance.originPath)) {
    throw new AixError(`Role guidance is not available for ${guidance.name}: ${guidance.originPath}`);
  }

  writeEditableGuidance(guidance.editablePath, readFileSync(guidance.originPath, "utf8"));
  return { ...guidance, status: "editable" };
}

function changedForResetAll(guidance: ActiveGuidanceDocument): boolean {
  if (guidance.ownerKind === "workflow") {
    return existsSync(guidance.editablePath);
  }

  return guidance.status === "modified" || guidance.status === "missing";
}

export function listGuidance(): ListGuidanceResult {
  const { workflow, rows } = allGuidanceRows();

  return {
    workflowName: workflow.name,
    guidance: rows
  };
}

export function publishGuidance(): PublishGuidanceResult {
  const workflow = activeWorkflow();
  const published: ActiveGuidanceDocument[] = [];
  const unchanged: ActiveGuidanceDocument[] = [];
  const workflowRows = workflowGuidanceRows(workflow);

  for (const guidance of workflowRows) {
    if (!existsSync(guidance.originPath)) {
      throw new AixError(`Workflow guidance origin is missing: ${guidance.originPath}`);
    }

    const origin = readFileSync(guidance.originPath, "utf8");

    if (existsSync(guidance.editablePath)) {
      const existing = readFileSync(guidance.editablePath, "utf8");

      if (existing !== origin) {
        throw new AixError(`Refusing to overwrite locally edited guidance: ${guidance.editablePath}`);
      }

      unchanged.push({ ...guidance, status: "editable" });
      continue;
    }

    writeEditableGuidance(guidance.editablePath, origin);
    published.push({ ...guidance, status: "editable" });
  }

  const roles = roleGuidanceRows(readLockfileJson().roles || []);

  return {
    workflowName: workflow.name,
    published,
    unchanged,
    alreadyEditableRoles: roles
  };
}

export function diffGuidanceCommands(): DiffGuidanceCommandsResult {
  const { workflow, rows } = allGuidanceRows();

  return {
    workflowName: workflow.name,
    commands: rows.map((guidance) => `aix guidance diff ${guidance.name}`)
  };
}

export function diffGuidance(name: string): DiffGuidanceResult {
  const { workflow, guidance } = findGuidance(name);

  if (!existsSync(guidance.editablePath)) {
    return {
      workflowName: workflow.name,
      name: guidance.name,
      diff: ""
    };
  }

  return {
    workflowName: workflow.name,
    name: guidance.name,
    diff: gitNoIndexDiff(guidance.originPath, guidance.editablePath)
  };
}

export function resetGuidance(name: string): ResetGuidanceResult {
  const { workflow, guidance } = findGuidance(name);

  return {
    workflowName: workflow.name,
    guidance: resetGuidanceDocument(guidance)
  };
}

export function previewResetAllGuidance(): ResetAllGuidancePreviewResult {
  const { workflow, rows } = allGuidanceRows();

  return {
    workflowName: workflow.name,
    guidance: rows.filter(changedForResetAll)
  };
}

export function resetAllGuidance(): ResetAllGuidanceResult {
  const preview = previewResetAllGuidance();
  const reset = preview.guidance.map(resetGuidanceDocument);

  return {
    workflowName: preview.workflowName,
    reset
  };
}
