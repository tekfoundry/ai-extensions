import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { AixError } from "../errors.js";
import type { DiscoveredSkill } from "./types.js";

function parseSkillNameFile(skillFile: string, invalidPrefix: string): string {
  const match = readFileSync(skillFile, "utf8").match(/^name:\s*([^\n\r]+)/m);
  const name = match?.[1]?.trim();

  if (!name) {
    throw new AixError(`${invalidPrefix}: ${skillFile} must declare a name.`);
  }

  return name;
}

export function parseSkillNameFromDirectory(skillPath: string): string {
  const skillFile = join(skillPath, "SKILL.md");

  if (!existsSync(skillFile)) {
    throw new AixError(`Invalid skill source: ${skillPath} is missing SKILL.md`);
  }

  return parseSkillNameFile(skillFile, "Invalid skill source");
}

function discoverFromDirectory(root: string, directory: string, skills: DiscoveredSkill[]): void {
  const skillFile = join(directory, "SKILL.md");

  if (existsSync(skillFile)) {
    skills.push({
      path: relative(root, directory) || ".",
      name: parseSkillNameFile(skillFile, "Invalid skill")
    });
    return;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      discoverFromDirectory(root, join(directory, entry.name), skills);
    }
  }
}

export function discoverSkills(root: string): DiscoveredSkill[] {
  if (!existsSync(root)) {
    throw new AixError(`Missing source path: ${root}`);
  }

  const skills: DiscoveredSkill[] = [];

  discoverFromDirectory(root, root, skills);

  return skills.sort((a, b) => a.path.localeCompare(b.path));
}
