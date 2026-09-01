import { AixError } from "../errors.js";
import type { ParsedRoleFile } from "./types.js";

export interface RoleDelegationResolution {
  role: ParsedRoleFile;
  mode: "prompt-overlay";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roleMentioned(input: string, roleName: string): boolean {
  return new RegExp(`(^|[^a-z0-9-])${escapeRegex(roleName)}([^a-z0-9-]|$)`, "i").test(input);
}

function explicitDelegationTarget(input: string): string | undefined {
  const match = input.match(/\b(?:use|delegate(?:\s+to)?|ask)\s+([a-z0-9]+(?:-[a-z0-9]+)*)\b/i);

  return match?.[1]?.toLowerCase();
}

function hasDelegationIntent(input: string): boolean {
  return /\b(?:use|delegate|ask)\b/i.test(input);
}

export function resolveRoleDelegation(input: string, roles: ParsedRoleFile[]): RoleDelegationResolution | undefined {
  const target = explicitDelegationTarget(input);
  const mentionedRoles = roles.filter((role) => roleMentioned(input, role.name));

  if (mentionedRoles.length > 1) {
    throw new AixError(
      `Ambiguous role delegation: ${mentionedRoles.map((role) => role.name).join(", ")}. Name exactly one role.`
    );
  }

  if (target) {
    const role = roles.find((candidate) => candidate.name === target);

    if (!role) {
      throw new AixError(`Unknown role for delegation: ${target}`);
    }

    return {
      role,
      mode: "prompt-overlay"
    };
  }

  if (mentionedRoles.length === 1 && hasDelegationIntent(input)) {
    return {
      role: mentionedRoles[0],
      mode: "prompt-overlay"
    };
  }

  return undefined;
}

export function buildPromptOverlayDelegation(role: ParsedRoleFile, task: string): string {
  return [
    "# Role Delegation",
    "",
    "Mode: prompt-overlay fallback",
    "",
    "You are operating as the delegated role below. Apply the role guidance only to this bounded task.",
    "",
    "## Selected Role",
    "",
    `Name: ${role.name}`,
    `Description: ${role.description}`,
    "",
    "## Parent-Owned Boundaries",
    "",
    "- The parent context owns plan state, worktree safety, verification review, and final decisions.",
    "- When PM routing delegated the task, the parent context may route, preserve worktree safety, review returned evidence, and report results only.",
    "- Parent review is minimal and exception-driven: trust delegated role evidence unless uncertainty, out-of-scope changes, failed tests, incomplete evidence, safety-sensitive changes, or another role's need for exact file content gives a concrete reason to re-read files.",
    "- The parent context must not run lifecycle skills, implementation, verification, lifecycle-state changes, or repo-changing work outside delegated roles.",
    "- Do not broaden scope, change lifecycle status, or claim completion for the parent.",
    "- Stop and return a blocking question when authorization, safety, or product intent is unclear.",
    "",
    "## Delegated Task",
    "",
    task.trim(),
    "",
    "## Role Operating Prompt",
    "",
    role.body.trim(),
    "",
    "## Required Return Evidence",
    "",
    "Return findings, recommended next actions, exact files or commands inspected, verification evidence, gaps, residual risk, and whether scope expanded."
  ].join("\n");
}
