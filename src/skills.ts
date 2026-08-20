import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { CliError } from "./errors.js";
import { resolveSource } from "./sources.js";

export interface DiscoveredSkill {
  path: string;
  name: string;
}

function parseSkillName(skillFile: string): string {
  const match = readFileSync(skillFile, "utf8").match(/^name:\s*([^\n\r]+)/m);
  const name = match?.[1]?.trim();

  if (!name) {
    throw new CliError(`Invalid skill: ${skillFile} must declare a name.`);
  }

  return name;
}

function discoverFromDirectory(root: string, directory: string, skills: DiscoveredSkill[]): void {
  const skillFile = join(directory, "SKILL.md");

  if (existsSync(skillFile)) {
    skills.push({
      path: relative(root, directory) || ".",
      name: parseSkillName(skillFile)
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
    throw new CliError(`Missing source path: ${root}`);
  }

  const skills: DiscoveredSkill[] = [];

  discoverFromDirectory(root, root, skills);

  return skills.sort((a, b) => a.path.localeCompare(b.path));
}

export function listSourceSkills(sourceName: string): DiscoveredSkill[] {
  return discoverSkills(resolveSource(sourceName).rootPath);
}

export function renderSkillList(sourceName: string, skills: DiscoveredSkill[]): string {
  if (skills.length === 0) {
    return `No skills found in source: ${sourceName}`;
  }

  return skills.map((skill) => `${skill.path}\t${skill.name}`).join("\n");
}
