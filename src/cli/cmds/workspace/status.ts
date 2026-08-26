import { collectWorkspaceStatus, type StatusRole, type StatusSkill, type WorkspaceStatus } from "../../../status/index.js";
import { renderTable } from "../../../ui/table.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

interface RenderStatusOptions {
  color?: boolean;
}

function valueOrDash(value: string | undefined): string {
  return value && value.trim() ? value : "-";
}

function shortCommit(value: string | undefined): string {
  return value ? value.slice(0, 12) : "-";
}

function refLabel(item: { sourceType?: string; requestedRef?: string }): string {
  return item.sourceType === "local" ? "local" : valueOrDash(item.requestedRef);
}

function commitLabel(item: { sourceType?: string; resolvedCommit?: string }): string {
  return item.sourceType === "local" ? "-" : shortCommit(item.resolvedCommit);
}

function colorEnabled(): boolean {
  if (process.env.AIX_FORCE_COLOR !== undefined && process.env.AIX_FORCE_COLOR !== "0") {
    return true;
  }

  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  return process.stdout.isTTY === true;
}

function statusHeading(value: string, useColor: boolean): string {
  return ansi(value, "1;35", "39;22", useColor);
}

function good(value: string, useColor: boolean): string {
  return ansi(value, "32", "39", useColor);
}

function warn(value: string, useColor: boolean): string {
  return ansi(value, "33", "39", useColor);
}

function bad(value: string, useColor: boolean): string {
  return ansi(value, "31", "39", useColor);
}

function subtle(value: string, useColor: boolean): string {
  return ansi(value, "2", "22", useColor);
}

function accent(value: string, useColor: boolean): string {
  return ansi(value, "36", "39", useColor);
}

function ansi(value: string, open: string, close: string, useColor: boolean): string {
  return useColor ? `\u001b[${open}m${value}\u001b[${close}m` : value;
}

function renderKeyValues(rows: Array<[string, string]>, options: RenderStatusOptions = {}): string {
  const width = rows.reduce((largest, [label]) => Math.max(largest, label.length), 0);

  return rows.map(([label, value]) => `  ${subtle(label.padEnd(width), options.color === true)}  ${value}`).join("\n");
}

function skillUpdateKey(skill: Pick<StatusSkill, "source" | "sourcePath">): string {
  return `${skill.source}/${skill.sourcePath}`;
}

function skillStatus(status: WorkspaceStatus, skill: StatusSkill, useColor: boolean): string {
  if (!status.update.checked) {
    return warn("unknown", useColor);
  }

  const pending = status.update.skillUpdates.some((update) => skillUpdateKey(update) === skillUpdateKey(skill));

  return pending ? warn("update available", useColor) : good("current", useColor);
}

function workflowStatus(status: WorkspaceStatus, useColor: boolean): string {
  if (!status.update.checked) {
    return warn("unknown", useColor);
  }

  const workflow = status.activeWorkflow;
  const pending = workflow && status.update.workflowUpdates.some((update) => update.name === workflow.name);

  return pending ? warn("update available", useColor) : good("current", useColor);
}

function renderSkillTable(title: string, skills: StatusSkill[], status: WorkspaceStatus, options: RenderStatusOptions): string {
  const useColor = options.color === true;

  if (skills.length === 0) {
    return `${statusHeading(title, useColor)}\n  ${subtle("none", useColor)}`;
  }

  return renderTable(
    [
      { header: "Name", value: (skill) => skill.activeName },
      { header: "Source", value: (skill) => `${skill.source}/${skill.sourcePath}` },
      { header: "Type", value: (skill) => valueOrDash(skill.sourceType) },
      { header: "Ref", value: (skill) => refLabel(skill) },
      { header: "Commit", value: (skill) => commitLabel(skill) },
      { header: "Status", value: (skill) => skillStatus(status, skill, useColor) }
    ],
    skills,
    { title: statusHeading(title, useColor) }
  );
}

function renderRoleTable(title: string, roles: StatusRole[] | undefined, options: RenderStatusOptions): string {
  const useColor = options.color === true;
  const roleRows = roles || [];

  if (roleRows.length === 0) {
    return `${statusHeading(title, useColor)}\n  ${subtle("none", useColor)}`;
  }

  return renderTable(
    [
      { header: "Name", value: (role) => role.activeName },
      { header: "Source", value: (role) => `${role.source}/${role.sourcePath}` },
      { header: "Type", value: (role) => valueOrDash(role.sourceType) },
      { header: "Ref", value: (role) => refLabel(role) },
      { header: "Commit", value: (role) => commitLabel(role) }
    ],
    roleRows,
    { title: statusHeading(title, useColor) }
  );
}

function renderSourceTable(title: string, sources: WorkspaceStatus["skillSources"], options: RenderStatusOptions): string {
  if (sources.length === 0) {
    return `${statusHeading(title, options.color === true)}\n  ${subtle("none", options.color === true)}`;
  }

  return renderTable(
    [
      { header: "Name", value: (source) => source.name },
      { header: "Type", value: (source) => source.type },
      { header: "Ref", value: (source) => valueOrDash(source.ref) },
      { header: "Path", value: (source) => valueOrDash(source.path) },
      { header: "URL", value: (source) => valueOrDash(source.url) }
    ],
    sources,
    { title: statusHeading(title, options.color === true) }
  );
}

function renderWorkflow(status: WorkspaceStatus, options: RenderStatusOptions): string {
  const useColor = options.color === true;
  const workflow = status.activeWorkflow;

  if (!workflow) {
    return `${statusHeading("Workflow", useColor)}\n  ${subtle("none", useColor)}`;
  }

  return renderTable(
    [
      { header: "Name", value: () => accent(workflow.name, useColor) },
      { header: "Source", value: () => accent(`${workflow.source}/${workflow.sourcePath}`, useColor) },
      { header: "Type", value: () => valueOrDash(workflow.sourceType) },
      { header: "Ref", value: () => refLabel(workflow) },
      { header: "Commit", value: () => commitLabel(workflow) },
      { header: "Docs", value: () => String(workflow.docCount) },
      { header: "Templates", value: () => String(workflow.templateCount) },
      { header: "Skills", value: () => String(workflow.skillCount) },
      { header: "Roles", value: () => String(workflow.roleCount) },
      { header: "Status", value: () => workflowStatus(status, useColor) }
    ],
    [workflow],
    { title: statusHeading("Workflow", useColor) }
  );
}

function renderHealth(status: WorkspaceStatus, options: RenderStatusOptions): string {
  const useColor = options.color === true;

  if (status.verificationIssues.length === 0) {
    return `${statusHeading("Health", useColor)}\n  ${good("ok", useColor)}`;
  }

  return [
    statusHeading("Health", useColor),
    ...status.verificationIssues.map((issue) => `  - ${bad(issue, useColor)}`)
  ].join("\n");
}

function updateUnavailableReason(reason: string | undefined): string {
  if (!reason || reason.trim() === "") {
    return "could not resolve sources";
  }

  if (reason.includes("Git command failed:")) {
    return "could not resolve source updates";
  }

  return reason.split(/\r?\n/)[0] || "could not resolve sources";
}

function renderUpdates(status: WorkspaceStatus, options: RenderStatusOptions): string {
  const useColor = options.color === true;
  const workflowCount = status.update.workflowUpdates.length;
  const skillCount = status.update.skillUpdates.length;

  if (!status.update.checked) {
    return [
      statusHeading("Updates", useColor),
      `  ${warn(`unavailable: ${updateUnavailableReason(status.update.unavailableReason)}`, useColor)}`
    ].join("\n");
  }

  if (skillCount === 0 && workflowCount === 0) {
    return `${statusHeading("Updates", useColor)}\n  ${good("up to date", useColor)}`;
  }

  const parts = [
    workflowCount > 0 ? `${workflowCount} ${workflowCount === 1 ? "workflow" : "workflows"}` : "",
    skillCount > 0 ? `${skillCount} ${skillCount === 1 ? "skill" : "skills"}` : ""
  ].filter(Boolean);

  return [
    statusHeading("Updates", useColor),
    `  ${warn(`${parts.join(" and ")} ${workflowCount + skillCount === 1 ? "needs" : "need"} updates`, useColor)}`
  ].join("\n");
}

export function renderStatus(status: WorkspaceStatus, options: RenderStatusOptions = {}): string {
  const useColor = options.color === true;

  return [
    statusHeading("AI Extensions status", useColor),
    "",
    statusHeading("Workspace", useColor),
    renderKeyValues([
      ["Initialized", status.manifestExists ? good("yes", useColor) : warn("no", useColor)],
      ["Manifest", status.manifestExists ? accent(status.manifestPath, useColor) : warn("missing", useColor)],
      ["Lockfile", status.lockfileExists ? accent(status.lockfilePath, useColor) : warn("missing", useColor)]
    ], options),
    "",
    renderWorkflow(status, options),
    "",
    renderSourceTable("Workflow sources", status.workflowSources, options),
    "",
    renderSourceTable("Skill sources", status.skillSources, options),
    "",
    renderSkillTable("Active skills", status.activeSkills, status, options),
    "",
    renderSkillTable("Dependency-only skills", status.dependencySkills, status, options),
    "",
    renderSkillTable("Workflow-owned skills", status.workflowSkills, status, options),
    "",
    renderRoleTable("Active roles", status.activeRoles, options),
    "",
    renderRoleTable("Workflow-owned roles", status.workflowRoles, options),
    "",
    renderHealth(status, options),
    "",
    renderUpdates(status, options)
  ].join("\n");
}

function runStatus(argv: string[]): CliResult {
  if (argv.length > 1) {
    throw new CliError("Usage: aix status", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderStatus(collectWorkspaceStatus(), { color: colorEnabled() }) };
}

export const statusCommand: Command = {
  name: "status",
  usage: "status",
  summary: "Show workspace, workflow, and skill status",
  splash: [{ usage: "status", summary: "Show workspace, workflow, and skill status" }],
  run: runStatus
};
