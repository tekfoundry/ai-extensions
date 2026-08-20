import { skillCommand } from "./cmds/skill/index.js";
import { skillsCommand } from "./cmds/skills/index.js";
import { workflowCommand } from "./cmds/workflow/index.js";
import { initCommand, statusCommand, verifyCommand } from "./cmds/workspace/index.js";
import type { Command } from "./types.js";

export const commands: Command[] = [
  initCommand,
  verifyCommand,
  statusCommand,
  workflowCommand,
  skillsCommand,
  skillCommand
];

export function findCommand(name: string): Command | undefined {
  return commands.find((command) => command.name === name);
}
