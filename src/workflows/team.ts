import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { DELIVERY_MODES, TASK_MODES, type DeliveryMode, type TaskMode } from "../pm/types.js";
import { isRecord } from "../validation/types.js";
import type { WorkflowManifestFile } from "./types.js";

const TEAM_BLOCK_PATTERN = /<!--\s*aix:team\s*\n([\s\S]*?)\n\s*-->/;

export interface WorkflowTeamRole {
  name: string;
  displayName: string;
  directory: string;
  responsibilities: string[];
  taskModes: TaskMode[];
  deliveryModes: DeliveryMode[];
  writeDomains: string[];
  deniedAreas: string[];
  requiredCapabilities: string[];
  requiredEvidence: string[];
  sharedArtifacts: string[];
  readOnly: boolean;
  serialization: "none" | "group" | "shared-artifact" | "integration";
}

export interface WorkflowTeam {
  workflow: string;
  version: string;
  requiredCapabilities: string[];
  roles: WorkflowTeamRole[];
}

export const BOSS_PRINCIPAL = "boss" as const;
export const STALE_WORKFLOW_ROLE_NAMES = ["product-strategist"] as const;

function fail(path: string, message: string): never {
  throw new AixError(`Invalid workflow team at ${path}: ${message}`);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(path, "must be a non-empty string.");
  }

  return value.trim();
}

function requireStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    fail(path, "must be an array of non-empty strings.");
  }

  return value.map((item) => (item as string).trim());
}

function requireEnumArray<T extends string>(value: unknown, values: readonly T[], path: string): T[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !values.includes(item as T))) {
    fail(path, `must contain only: ${values.join(", ")}.`);
  }

  return value as T[];
}

function optionalBoolean(value: unknown, fallback: boolean, path: string): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") fail(path, "must be a boolean.");
  return value;
}

function assertDesignPlanExecuteRoster(team: WorkflowTeam, path: string): void {
  const names = team.roles.map((role) => role.name);
  const count = (name: string) => names.filter((candidate) => candidate === name).length;

  if (names.includes("product-strategist")) fail(path, "product-strategist is stale; use product-owner.");
  if (names.includes(BOSS_PRINCIPAL)) fail(path, "boss is a human principal and cannot be a roster role.");
  if (names.includes("project-manager")) fail(path, "project-manager is the workflow coordinator and cannot be a delegatable roster role.");
  if (count("product-owner") !== 1) fail(path, "must contain exactly one product-owner role.");
  if (count("release-engineer") !== 1) fail(path, "must contain exactly one release-engineer role.");

  const releaseEngineer = team.roles.find((role) => role.name === "release-engineer");
  if (!releaseEngineer) return;

  const forbiddenDomainPatterns = [
    /^(?:src|tests?|\.aix\/pm|aix\.json|aix\.lock\.json|AGENTS\.md)(?:\/|$)/i,
    /registry/i,
    /global[-_ ]?install/i,
    /publish(?:ing)?/i,
    /unrestricted/i,
    /external[-_ ]?release/i
  ];
  const unsafeWriteDomain = releaseEngineer.writeDomains.find((domain) =>
    forbiddenDomainPatterns.some((pattern) => pattern.test(domain))
  );
  if (unsafeWriteDomain) {
    fail(`${path}.release-engineer write domains`, `cannot include denied area: ${unsafeWriteDomain}.`);
  }

  const requiredDeniedAreas = [
    "src/",
    "tests/",
    ".aix/pm/",
    "aix.json",
    "aix.lock.json",
    "AGENTS.md",
    "publishing",
    "registry",
    "global-install",
    "unrestricted external release"
  ];
  const missingDeniedArea = requiredDeniedAreas.find((required) =>
    !releaseEngineer.deniedAreas.some((area) => area.toLowerCase().includes(required.toLowerCase()))
  );
  if (missingDeniedArea) {
    fail(`${path}.release-engineer denied areas`, `must explicitly deny ${missingDeniedArea}.`);
  }
}

export function parseWorkflowTeam(markdown: string, path = "team.md"): WorkflowTeam {
  const match = markdown.replace(/\r\n/g, "\n").match(TEAM_BLOCK_PATTERN);

  if (!match) {
    fail(path, "must contain an aix:team metadata block.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(match[1]);
  } catch {
    fail(path, "contains malformed aix:team JSON.");
  }

  if (!isRecord(raw)) {
    fail(path, "aix:team metadata must be an object.");
  }

  if (!Array.isArray(raw.roles) || raw.roles.length === 0) {
    fail(`${path}.roles`, "must be a non-empty array.");
  }

  const roleNames = new Set<string>();
  const roles = raw.roles.map((role, index) => {
    const rolePath = `${path}.roles[${index}]`;

    if (!isRecord(role)) {
      fail(rolePath, "must be an object.");
    }

    const name = requireString(role.name, `${rolePath}.name`);
    const displayName = requireString(role.displayName, `${rolePath}.displayName`);
    const directory = requireString(role.directory, `${rolePath}.directory`);
    if (roleNames.has(name)) {
      fail(`${rolePath}.name`, `duplicates role ${name}.`);
    }
    roleNames.add(name);

    return {
      name,
      displayName,
      directory,
      responsibilities: requireStringArray(role.responsibilities, `${rolePath}.responsibilities`),
      taskModes: requireEnumArray(role.taskModes, TASK_MODES, `${rolePath}.taskModes`),
      deliveryModes: requireEnumArray(role.deliveryModes, DELIVERY_MODES, `${rolePath}.deliveryModes`),
      writeDomains: requireStringArray(role.writeDomains, `${rolePath}.writeDomains`),
      deniedAreas: requireStringArray(role.deniedAreas, `${rolePath}.deniedAreas`),
      requiredCapabilities: requireStringArray(role.requiredCapabilities, `${rolePath}.requiredCapabilities`),
      requiredEvidence: requireStringArray(role.requiredEvidence, `${rolePath}.requiredEvidence`),
      sharedArtifacts: requireStringArray(role.sharedArtifacts ?? [], `${rolePath}.sharedArtifacts`),
      readOnly: optionalBoolean(role.readOnly, false, `${rolePath}.readOnly`),
      serialization: role.serialization === undefined ? "none" : requireEnumArray([role.serialization], ["none", "group", "shared-artifact", "integration"], `${rolePath}.serialization`)[0]
    };
  });

  for (const [index, role] of roles.entries()) {
    const rolePath = `${path}.roles[${index}]`;
    if (role.readOnly && role.deliveryModes.some((mode) => mode !== "report-only")) fail(rolePath, "readOnly roles may only support report-only delivery.");
    if (role.serialization === "shared-artifact" && role.sharedArtifacts.length === 0) fail(rolePath, "shared-artifact serialization requires sharedArtifacts.");
    if (role.serialization === "integration" && !role.deliveryModes.includes("isolated-change")) fail(rolePath, "integration serialization requires isolated-change delivery.");
  }

  const team = {
    workflow: requireString(raw.workflow, `${path}.workflow`),
    version: requireString(raw.version, `${path}.version`),
    requiredCapabilities: requireStringArray(raw.requiredCapabilities, `${path}.requiredCapabilities`),
    roles
  };

  if (team.workflow === "design-plan-execute") {
    assertDesignPlanExecuteRoster(team, path);
  }

  return team;
}

export function readWorkflowTeam(workflow: WorkflowManifestFile, packageRoot: string): WorkflowTeam {
  if (!workflow.team) {
    throw new AixError(`Workflow ${workflow.name} does not declare a team.md contract.`);
  }

  const teamPath = join(packageRoot, workflow.team.path);
  if (!existsSync(teamPath)) {
    throw new AixError(`Missing workflow team file: ${teamPath}`);
  }

  const team = parseWorkflowTeam(readFileSync(teamPath, "utf8"), teamPath);
  if (team.workflow !== workflow.name) {
    throw new AixError(`Workflow team ${teamPath} belongs to ${team.workflow}, not ${workflow.name}.`);
  }
  if (team.version !== workflow.team.version) {
    throw new AixError(`Workflow team ${teamPath} has version ${team.version}, expected ${workflow.team.version}.`);
  }
  if (workflow.requiredCapabilities && workflow.requiredCapabilities.some((capability) => !team.requiredCapabilities.includes(capability))) {
    throw new AixError(`Workflow team ${teamPath} is missing a manifest-required capability.`);
  }

  for (const role of team.roles.filter((candidate) => candidate.name !== "project-manager")) {
    if (!existsSync(join(packageRoot, role.directory, "ROLE.md"))) {
      fail(teamPath, `role ${role.name} points to a missing ROLE.md: ${role.directory}`);
    }
  }

  return team;
}

export function workflowTeamHash(workflow: WorkflowManifestFile, packageRoot: string): { path: string; version: string; sha256: string } | undefined {
  if (!workflow.team) {
    return undefined;
  }

  const teamPath = join(packageRoot, workflow.team.path);
  const contents = readFileSync(teamPath);

  return {
    path: workflow.team.path,
    version: workflow.team.version,
    sha256: createHash("sha256").update(contents).digest("hex")
  };
}
