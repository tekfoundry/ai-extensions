import type { NamedSourceDefinition } from "../sources/index.js";
import { renderTable } from "../ui/table.js";
import type { ListedSkill } from "./types.js";

interface RenderSkillListOptions {
  missingOnly?: boolean;
}

export function renderSkillList(sourceName: string, skills: ListedSkill[], options: RenderSkillListOptions = {}): string {
  if (skills.length === 0) {
    return options.missingOnly
      ? `No missing skills found in source: ${sourceName}`
      : `No skills found in source: ${sourceName}`;
  }

  return renderTable(
    [
      { header: "Path", value: (skill) => skill.path },
      { header: "Name", value: (skill) => skill.name },
      { header: "Install Command", value: (skill) => skill.installCommand }
    ],
    skills,
    { title: options.missingOnly ? `Missing skills in ${sourceName}:` : `Skills in ${sourceName}:` }
  );
}

function renderSourceDefinition(source: NamedSourceDefinition, index: number): string {
  const details = [
    source.definition.url,
    source.definition.path ? `path: ${source.definition.path}` : undefined,
    source.definition.ref ? `ref: ${source.definition.ref}` : undefined
  ].filter((detail): detail is string => Boolean(detail));

  return `${index + 1}. ${source.name}\t${details.join(" | ")}`;
}

export function renderSourceList(sources: NamedSourceDefinition[]): string {
  if (sources.length === 0) {
    return "No sources configured.";
  }

  return [
    "Available sources:",
    ...sources.map(renderSourceDefinition),
    "",
    "Run aix skills list <source> to list skills from a source."
  ].join("\n");
}
