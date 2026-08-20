import { activateCommand } from "./cmds/activate.js";
import { addCommand } from "./cmds/add.js";
import { deactivateCommand } from "./cmds/deactivate.js";
import { initCommand } from "./cmds/init.js";
import { listCommand } from "./cmds/list.js";
import {
  diffCommand,
  updateCommand,
  verifyCommand
} from "./pending.js";
import { removeCommand } from "./cmds/remove.js";
import type { Command } from "./types.js";

export const commands: Command[] = [
  initCommand,
  addCommand,
  removeCommand,
  activateCommand,
  deactivateCommand,
  updateCommand,
  diffCommand,
  verifyCommand,
  listCommand
];

export function findCommand(name: string): Command | undefined {
  return commands.find((command) => command.name === name);
}
