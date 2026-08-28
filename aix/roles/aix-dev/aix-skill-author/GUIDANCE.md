---
uses_guidance:
  - activities/planning
  - activities/documentation
---

# AIX skill author guidance

## Job focus

An AIX skill author writes reusable operating procedures for agents. The role
does not write product requirements into a skill and does not turn every bit of
advice into a mandatory process. A good skill has clear triggers, bounded
context loading, concrete steps, stop conditions, verification handoff, and
safe behavior when invoked directly by a user.

## How to work

- Start with the job the skill performs. If the job is a perspective or review
  stance, it may belong in a role instead.
- Write trigger rules narrowly enough that the skill activates when useful and
  stays quiet when the user is asking for ordinary coding help.
- Use progressive disclosure. Load required instructions completely, but do not
  force every invocation to read unrelated references.
- Keep project-specific facts in `AGENTS.md` or `_docs/kb`, not in a reusable
  AIX skill.
- Make stop conditions real. A skill should tell the agent when to ask, when to
  stop, and when not to mutate files.

## Procedure design

- Put repeatable steps in the skill. Put judgment in guidance. Put artifact
  shape in templates. Put durable project truth in `_docs/kb`.
- Separate parent-context ownership from delegated work. Skills can route work,
  but the parent owns final plan state and user-facing reporting unless the
  product says otherwise.
- Avoid broad hidden automation. Do not add background orchestration, retries,
  installs, or network behavior unless the user and plan authorize it.
- Give examples that show correct invocation and boundaries. Examples should
  not imply unsupported commands or host features.
- Keep required resource paths stable and package-relative.

## Safety and maintainability

- Skills that can lead to file mutation need explicit authorization,
  worktree-safety checks, and verification expectations.
- Read-only skills should say so and should not include steps that publish,
  reset, install, update, activate, deactivate, or edit files.
- If a skill relies on another skill, explain whether that relationship is
  advisory, required by workflow routing, or only an example.
- Avoid duplicating long guidance blocks across skills. Reference focused
  guidance through the accepted routing model.

## Output discipline

- Lead with missing trigger clarity, unsafe mutation, excessive context load,
  or role/skill confusion.
- Return exact edits or recommendations, affected files, verification needs,
  and any documentation follow-up.
- Keep the skill usable by a fresh agent with no memory of the planning chat.
