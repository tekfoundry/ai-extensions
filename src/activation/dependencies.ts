import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import type { LockfileSkillDependency } from "../schema.js";
import type { DiscoveredSkill } from "../skills.js";

export interface ResolvedSkillDependency extends LockfileSkillDependency {
  reason: string;
}

interface InferredDependency {
  name: string;
  reason: string;
}

function uniqueInferredDependencies(dependencies: InferredDependency[]): InferredDependency[] {
  const byName = new Map<string, InferredDependency>();

  for (const dependency of dependencies) {
    if (!byName.has(dependency.name)) {
      byName.set(dependency.name, dependency);
    }
  }

  return [...byName.values()];
}

export function inferSkillDependencies(skillDirectory: string): InferredDependency[] {
  const contents = readFileSync(join(skillDirectory, "SKILL.md"), "utf8");
  const dependencies: InferredDependency[] = [];
  const pattern = /Call\s+the\s+Skill\s+tool\s+with\s+["']([^"']+)["']/gi;

  for (const match of contents.matchAll(pattern)) {
    const name = match[1]?.trim();

    if (name) {
      dependencies.push({
        name,
        reason: match[0]
      });
    }
  }

  return uniqueInferredDependencies(dependencies);
}

export function resolveInferredDependencies(
  source: string,
  sourcePath: string,
  skillDirectory: string,
  discoveredSkills: DiscoveredSkill[]
): ResolvedSkillDependency[] {
  return inferSkillDependencies(skillDirectory).map((dependency) => {
    const matches = discoveredSkills.filter((skill) => skill.name === dependency.name);

    if (matches.length === 0) {
      throw new AixError(
        `Unable to resolve inferred dependency "${dependency.name}" for ${source}/${sourcePath}.`
      );
    }

    if (matches.length > 1) {
      throw new AixError(
        `Inferred dependency "${dependency.name}" for ${source}/${sourcePath} is ambiguous.`
      );
    }

    const [match] = matches;

    return {
      source,
      sourcePath: match.path,
      activeName: match.name,
      type: "inferred",
      reason: dependency.reason
    };
  });
}
