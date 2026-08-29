---
name: get-guidance
description: Resolve a bounded read-only guidance list for an active role, skill, workflow activity, and task context.
---

# Get Guidance

Use this skill when a caller asks which AIX guidance documents should inform a
specific delegated role, skill, workflow activity list, or task.

This skill is read-only. Do not install, update, activate, deactivate,
publish, reset, edit, delete, or rewrite guidance. Return a bounded reading
list and any missing, ambiguous, or conflicting guidance notes.

## Required caller context

The caller must provide all four fields. A field may be `none` only when that
context truly does not apply. `activity` is accepted for compatibility with
older callers; new project-manager delegation should use `activities`.

```yaml
requesting_role: none | <active-role-name>
requesting_skill: none | <active-skill-name>
activity: none | <activity-name>
activities:
  - <activity-name>
task_context: <short summary>
```

If the role, skill, task context, and both activity fields are missing, or if
`task_context` is empty, return no guidance. Ask the caller to rerun the
request with the complete payload.

If `requesting_role`, `requesting_skill`, `activity`, and `activities` are all
`none`, return no guidance unless `task_context` names a concrete guidance need
that matches known guidance. Do not guess from vague context.

## Resolution order

Resolve only documents relevant to the caller context. Prefer project-owned
active files where the model allows edits, then package origins.

1. Role guidance: `.agents/roles/<requesting_role>/GUIDANCE.md`, when
   `requesting_role` is not `none` and the active role guidance file exists.
2. Activity override: `.agents/guidance/activities/<activity>.md`, for each
   requested activity when the project has an override.
3. Activity origin: active workflow package guidance, normally
   `.agents/packages/workflows/<source>/<workflow>/guidance/activities/<activity>.md`,
   when no project override exists.
4. Shared override or origin: `.agents/guidance/shared.md` first, then the
   active workflow package `guidance/shared.md`.

Do not hardcode the allowed activity names. Discover available activities from
the active workflow guidance directory. If any requested activity names an
unknown activity, report that no matching activity guidance exists and list the
available activity names.

If `requesting_role` is `none`, skip role guidance. If `requesting_skill` is
`none`, skip skill metadata matching. If `activity` and `activities` are
`none`, use role and guidance metadata as hints. Return candidate activities
instead of choosing one when several fit.

Do not use this skill to load the project-manager role's own startup guidance.
Project-manager startup guidance comes from its active `GUIDANCE.md` file and
adjacent active files whose names end in `.GUIDANCE.md`.

## Metadata hints

Use front matter as advisory routing data.

Activity guidance may declare:

```yaml
applies_to:
  roles:
    - quality-engineer
  skills:
    - plan-review
```

Role guidance may declare:

```yaml
uses_guidance:
  - activities/verification
  - activities/review
```

Metadata helps choose a smaller reading list. It is not an automatic
dependency resolver and must not trigger file changes, installation, skill
activation, command execution, or workflow routing changes.

When metadata points at missing guidance, report the gap. Do not fail unless
the caller's workflow, role, or skill contract says the missing guidance is
required.

## Conflict handling

Guidance has lower priority than user requests, repository `AGENTS.md`,
managed workflow instructions, skill procedures, role contracts, and safety
rules.

When guidance conflicts with a higher-priority instruction:

- report the conflict plainly
- ignore the conflicting guidance
- keep the rest of the non-conflicting reading list when it is still useful

Do not use guidance to override lifecycle gates, safety checks, role scope,
skill procedures, file ownership rules, confirmation requirements, or user
instructions.

## Output

Return a short result with these parts:

- the resolved caller context
- recommended reading list with path, kind, source, and why it matched
- candidates or gaps, when a role, activity, or metadata reference is missing
- conflicts ignored because higher-priority instructions won
- confirmation that no files were changed

Keep the list bounded. Prefer the exact role guidance, one activity document,
shared guidance, and the legacy fallback only when needed. Do not dump every
role, every activity, or unrelated workflow documentation.

## Examples

Input:

```yaml
requesting_role: quality-engineer
requesting_skill: plan-review
activity: none
activities:
  - verification
task_context: reviewing a backlog plan's verification readiness
```

Expected result: recommend active `roles/quality-engineer` guidance, the
verification activity guidance from the project override or workflow origin,
and shared workflow guidance when present. Do not recommend planning,
implementation, review, or documentation activity guidance unless metadata or
task context gives a specific reason.

Input:

```yaml
requesting_role: none
requesting_skill: task-execute
activity: none
activities: none
task_context: implementing a small active-plan task
```

Expected result: do not invent a role. Use skill metadata to return candidate
activity guidance such as `activities/implementation` when available, plus
shared guidance. Ask for an activity if several candidates are equally likely.
