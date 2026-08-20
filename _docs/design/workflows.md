# Workflow Design

## Purpose

AI Extensions should manage more than individual skills. A workflow is a
project-local AI operating model: process docs, expected directories, and the
skills an agent needs to follow that process.

The first workflow is the AI Agent Workflow currently represented by:

- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- the plan and task lifecycle skills

These files define how agents and developers create design intent, maintain
active plans, execute phased tasks, verify work, and keep project-owned docs
separate from package-managed agent process files.

## Workflow Packages

Workflow packages should be Git-backed and installed as a unit. Unlike skill
sources, workflows are not catalogs where users pick a few entries from a large
collection. A workflow describes the process for a project, so the MVP should
allow only one active workflow at a time.

The `aix` repository should store its default workflow under `aix/workflows`
instead of scattering workflow docs at the repository root or only under the
local `.agents` working directory.

Recommended source layout:

```text
aix/
  workflows/
    design-plan-execute/
      workflow.json
      AGENTS.append.md
      README.md
      workflow.md
      engineering-best-practices.md
      skills/
        project-init/
          SKILL.md
        plan-create/
          SKILL.md
        task-execute/
          SKILL.md
```

The workflow folder should still follow convention, but the first
implementation should include a small `workflow.json` install manifest. The
manifest should not become a dependency system. Its job is to name the workflow
and declare install integration points that convention cannot express safely,
especially root `AGENTS.md` integration.

Recommended manifest shape:

```json
{
  "name": "design-plan-execute",
  "agentsMd": {
    "mode": "managed-block",
    "source": "AGENTS.append.md",
    "marker": "aix:workflow design-plan-execute"
  },
  "docs": [
    "README.md",
    "workflow.md",
    "engineering-best-practices.md"
  ],
  "skillsDir": "skills"
}
```

The workflow name must match the folder name. Recognized workflow docs are
copied into `.agents/`, and valid workflow-local skills under `skills/` are
activated through `.agents/skills`.

Workflow-local skills should be self-contained in the workflow package for the
MVP. External skill dependencies can be revisited later, but they would make
workflow updates harder to explain and easier to break. If a workflow wants to
mention third-party skills, it can document them as recommendations rather than
installing them automatically.

## Install Flow

Workflows should use an install command instead of the skill `add` plus
`activate` split:

```bash
aix install workflow [git-or-github-tree-url] [alias]
```

Installing a workflow should:

1. If no URL is provided, list bundled workflows from `aix/workflows` and ask
   the user which workflow to install.
2. If a URL is provided, normalize the Git or GitHub tree URL into Git URL,
   ref, and workflow path.
3. Fetch the selected source into the shared Git cache.
4. Read and validate `workflow.json`.
5. Discover workflow docs and workflow-local skills from the manifest and
   directory convention.
6. Refuse when another workflow is active unless a later explicit replace flow
   owns that behavior. The error should tell the user to run
   `aix uninstall workflow` first.
7. Copy recognized workflow docs into `.agents/`.
8. Insert or update the workflow-managed block in root `AGENTS.md`.
9. Materialize workflow-local skills under `.agents/packages/workflows`.
10. Expose workflow-owned skills through `.agents/skills`.
11. Create missing project-owned `_docs` directories when needed.
12. Write root workflow intent to `aix.json`.
13. Write exact workflow doc, `AGENTS.md` managed block, and workflow-owned
    skill hashes to `aix.lock.json`.

Workflow install should be transactional. If any workflow doc or workflow-owned
skill would overwrite local drift, or if the existing managed `AGENTS.md` block
does not match the lockfile, the command should stop before changing files.

## Root AGENTS.md Integration

Root `AGENTS.md` is the workflow's primary cross-agent integration point.
Codex, Cursor, VS Code, Copilot agent instructions, and other tools either read
`AGENTS.md` directly or can bridge to it. The detailed workflow docs should
live under `.agents/`, but root `AGENTS.md` needs a small managed block that
tells agents to use those docs.

The workflow package should keep that text in `AGENTS.append.md`, not inline in
JSON. Markdown belongs in Markdown. `workflow.json` declares where the text is
and which marker guards it.

Install should write the append text inside a managed block:

```md
<!-- aix:workflow design-plan-execute start -->
## AI Agent Workflow

Use `.agents/README.md` as the reusable process router.
Read `.agents/workflow.md` before substantial implementation work.
Read `.agents/engineering-best-practices.md` for agent-facing engineering guidance.
<!-- aix:workflow design-plan-execute end -->
```

Content outside the managed block is project-owned and must be preserved.
Content inside the managed block is package-managed workflow content. If a user
edits the managed block, `aix verify` should report drift and workflow updates
or removal should refuse to overwrite or delete it without an explicit future
repair flow.

## Ownership And Drift

Workflow docs copied into `.agents/` are package-managed. Project knowledge in
`_docs/` remains project-owned. Installing a workflow may create missing
directories such as `_docs/design`, `_docs/plans`, `_docs/plans/backlog`, and
`_docs/plans/completed`, but routine workflow updates should not rewrite
project-authored design or plan documents.

Root `AGENTS.md` is mixed ownership. The workflow-owned managed block is
package-managed. Everything outside that block belongs to the project.

Workflow-owned skills are not normal user-requested root skills. They are
owned by the active workflow. Direct deactivation should refuse to remove them:

```text
Cannot deactivate task-execute because it is owned by workflow design-plan-execute.
Remove or replace the workflow instead.
```

Users can still edit workflow docs or workflow-owned skills locally, but those
edits become drift. `aix verify` should report the drift, and workflow updates
should refuse to overwrite it. The healthy team path is to improve the
workflow source repository, review the change there, then run `aix diff
workflow` and `aix update workflow` in consuming projects.

## Commands

The MVP workflow command set should be small:

```bash
aix install workflow [git-or-github-tree-url] [alias]
aix uninstall workflow
aix diff workflow
aix update workflow
```

`aix verify` should include workflow checks alongside existing manifest,
lockfile, package, and active skill checks.

`aix uninstall workflow` should remove the active workflow docs and workflow-owned
skills only after local drift checks pass. It should leave project-owned
`_docs` content in place.

Replacing one workflow with another should remain deferred until the install,
remove, diff, update, and verify behavior is reliable.
