# Workflow orchestration

An AIX workflow is an installable operating model for agent-assisted work. It
groups process documentation, skills, roles, guidance, templates, and project
instructions so they move together as one package.

## The PM model

A workflow can register a team with AIX's project-manager role. The PM is the
coordination point for meaningful project work. Boss, the human decision
principal, gives the PM the request. The PM chooses the right team members and
delegates bounded work to them as sub-agents. The PM brings their results and
evidence back together for Boss.

```text
Boss gives the PM a request
        ↓
PM selects the registered team
        ↓
Sub-agents handle bounded responsibilities
        ↓
PM coordinates results, verification, and handoff
```

The PM does not replace the human decision principal. Boss retains authority
for priorities, risky approvals, exceptions, final acceptance, and release
decisions.

Workflows choose their own process. The default `design-plan-execute` workflow
uses the PM to connect planning, implementation, verification, and
documentation. A different workflow can define another team and lifecycle
while using the same AIX package model.

## Install a workflow

Initialize the project first:

```bash
aix init
```

Then install the bundled default workflow:

```bash
aix workflow install
```

You can also install a workflow from a local path or GitHub tree URL:

```bash
aix workflow install aix/workflows/design-plan-execute
aix workflow install https://github.com/example/ai-assets/tree/main/workflows/team-flow team-flow
```

A project can have one active workflow at a time. A workflow install stages and
validates the package, writes its docs into `.agents/`, updates the managed
`AGENTS.md` block, activates workflow-owned skills and roles, and records the
result in `aix.json` and `aix.lock.json`.

Check or update the active workflow with:

```bash
aix workflow diff
aix workflow update
aix workflow uninstall
```

`aix workflow uninstall` removes package-managed workflow content. It leaves
project-owned `_docs` content and text outside the managed `AGENTS.md` block
alone.

## Bundled workflows

### Design-plan-execute

[`design-plan-execute`](../aix/workflows/design-plan-execute/README.md) is the
default workflow for coding agents. It keeps work grounded in project
knowledge, small plans, verified changes, and documentation that stays current
with the code.

It includes a PM role, a registered development team, lifecycle skills,
activity guidance, templates, and managed project instructions. Its detailed
package documentation lists the installed roles, skills, files, and team
contract.

### Agile Kanban

[`agile-kanban`](../aix/workflows/agile-kanban/README.md) is a lightweight
Kanban workflow. It uses Markdown work items organized by state directories for
Backlog, Ready, In Progress, Review, Blocked, and Done. It does not require
Jira, Trello, GitHub Projects, Linear, or another external service.

## Create a custom workflow

A custom workflow is a directory package with a `workflow.json` file:

```text
workflows/team-flow/
  workflow.json
  AGENTS.append.md
  README.md
  workflow.md
  guidance/
    shared.md
    activities/
      planning.md
  skills/
    project-init/
      SKILL.md
    task-execute/
      SKILL.md
```

The manifest names the workflow, its managed `AGENTS.md` integration, docs,
guidance, templates, skills, roles, team, and required host capabilities.
Skills under `skills/` become workflow-owned skills. Workflow-owned assets
cannot be removed with standalone lifecycle commands.

Start with the bundled
[`design-plan-execute` workflow](../aix/workflows/design-plan-execute/) when
you need a complete example.

## PM runtime checks

The PM runtime has commands for inspection, host capability checks, and cleanup:

```bash
aix pm status
aix pm doctor
aix pm tidy
```

`aix pm tidy` previews cleanup by default. Use its explicit mutation options
only when you intend to archive, apply housekeeping, or purge eligible PM
runtime data.
