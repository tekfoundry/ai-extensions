import { roleCommand } from "./cmds/role/index.js";
import { skillCommand } from "./cmds/skill/index.js";
import { skillsCommand } from "./cmds/skills/index.js";
import { templatesCommand } from "./cmds/templates/index.js";
import { workflowCommand } from "./cmds/workflow/index.js";
import { initCommand, statusCommand, updateCommand, verifyCommand } from "./cmds/workspace/index.js";
import type { Command } from "./types.js";

export const commands: Command[] = [
  initCommand,
  verifyCommand,
  statusCommand,
  updateCommand,
  workflowCommand,
  templatesCommand,
  roleCommand,
  skillsCommand,
  skillCommand
];

export function findCommand(name: string): Command | undefined {
  return commands.find((command) => command.name === name);
}
