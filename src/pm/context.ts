import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { readWorkflowTeam, type WorkflowTeam } from "../workflows/team.js";
import { readWorkflowManifest } from "../workflows/manifest.js";
import { parseRoleFileFromPath, parseRoleGuidanceFileFromPath } from "../roles/discovery.js";
import { roleEntrypointPath, roleGuidancePath } from "../paths/agents.js";

export interface WorkerContext {
  projectInstructions: string;
  roleInstructions: string;
  roleGuidance: string;
  protocol: string;
  teamExcerpt: string;
  brief: string;
}

export function loadWorkerContext(input: {
  projectRoot?: string;
  roleDirectory: string;
  protocolPath: string;
  teamPath: string;
  brief: string;
}): WorkerContext {
  const projectRoot = input.projectRoot || process.cwd();
  const projectInstructions = existsSync(join(projectRoot, "AGENTS.md"))
    ? readFileSync(join(projectRoot, "AGENTS.md"), "utf8")
    : "";
  const role = parseRoleFileFromPath(roleEntrypointPath(input.roleDirectory), { requireContract: true });
  const roleGuidance = parseRoleGuidanceFileFromPath(roleGuidancePath(input.roleDirectory));

  return {
    projectInstructions,
    roleInstructions: role.body,
    roleGuidance: roleGuidance.body,
    protocol: readFileSync(input.protocolPath, "utf8"),
    teamExcerpt: readFileSync(input.teamPath, "utf8"),
    brief: input.brief
  };
}

export function loadWorkflowTeamContext(packageRoot: string): { team: WorkflowTeam; teamPath: string } {
  const workflow = readWorkflowManifest(packageRoot);

  if (!workflow.team) {
    throw new AixError(`Workflow ${workflow.name} does not declare a team contract.`);
  }

  return {
    team: readWorkflowTeam(workflow, packageRoot),
    teamPath: join(packageRoot, workflow.team.path)
  };
}
