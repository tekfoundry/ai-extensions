# Author skills for AIX

![AIX skills management summary](../assets/skills-summary.png)

A skill is a repeatable procedure an agent can follow to complete a task. A
good skill has a clear trigger, a bounded sequence of steps, the context it
needs, and a concrete result to return.

## Skill structure

A skill is a folder containing `SKILL.md`. It can be flat or nested in a Git
repository:

```text
skills/
  review/
    SKILL.md
```

The front matter should give the skill a stable name and a description that
makes its trigger clear. The body should explain when to use it, what to
inspect, which steps to follow, what evidence to collect, and what output to
return.

Example `SKILL.md`:

```md
---
name: review
description: Review code changes for correctness, regression risk, and missing tests.
---

# Review

Use this skill when the user asks for a code review.

Start with findings, ordered by severity. Include file and line references.
Then list open questions, test gaps, and residual risk. Keep summaries brief.
```

When a skill needs a particular expert perspective, pair it with a role. The
role sets the point of view and boundaries; the skill supplies the procedure.

## Bundled skills

The bundled skills include standalone helpers and skills owned by the default
workflow:

| Skill | What it does |
| --- | --- |
| [`brainstorming-skill`](../aix/workflows/design-plan-execute/skills/brainstorming-skill/README.md) | Runs project-grounded brainstorming before implementation planning and records approved and in-flight ideas. |
| [`discover-skill`](../aix/skills/discover-skill/README.md) | Finds installable software-development skills from configured sources and known repositories. |
| [`get-guidance`](../aix/skills/get-guidance/README.md) | Resolves a bounded reading list from active role and workflow guidance. |

The default workflow also provides lifecycle skills for project setup, design,
planning, implementation, verification, review, and documentation. See the
[`design-plan-execute` skills directory](../aix/workflows/design-plan-execute/skills/)
for the complete list.

## Standalone and workflow-owned skills

Standalone skills come from a reusable skill source and can be activated by a
project independently. Workflow-owned skills live inside a workflow package
and support that workflow's process. Workflow-owned skills follow the
workflow's lifecycle and cannot be removed with standalone skill commands.

For teams, the practical benefit is that `aix.json` and `aix.lock.json` travel
with the repository. Developers can activate the same skills from the same
sources at the same locked commits instead of keeping separate copies of agent
instructions.

## Discover and activate a skill

Add a Git-backed source and list the skills it exposes:

```bash
aix skills add https://github.com/example/ai-assets/tree/main/skills team-skills
aix skills list team-skills
```

Activate one skill, with an optional local alias:

```bash
aix skill activate team-skills/review
aix skill activate team-skills/review team-review
```

The alias changes the active local name without changing the upstream package
copy. `aix skills list <source>` reports nested skills by their source-relative
path and provides a copyable activation command.

## Maintain skills

```bash
aix skills diff
aix skills update
aix skill deactivate team-review
aix skills remove team-skills
```

`aix skills add` records and indexes a source. `aix skill activate` materializes
one selected skill under `.agents/skills/` and records the choice in the
project manifest. Diff, update, and deactivate check for local drift before
changing or removing active files. A source can be removed only after its
active skills have been deactivated.

Workflow-owned skills are updated or removed through their owning workflow.
For example, a missing skill that belongs to the active workflow is restored
with `aix workflow update`, not with standalone activation.

## Writing a useful skill

Keep the procedure narrow enough that an agent can finish it and report a clear
result. State the trigger in plain language, identify the files or project
state it must inspect, and define what counts as complete. Include safety
checks when the skill can modify files, change lifecycle state, or affect
managed assets.

When you are writing or revising a skill with an agent, use the
`aix-skill-author` role. It helps keep the trigger clear, the steps repeatable,
and the skill usable on its own or inside the workflow that owns it.
