# Workflow Lifecycle

## Workflow Package Shape

The default workflow lives under `aix/workflows/design-plan-execute/` and is
installed as an all-or-nothing workflow package.

```text
workflow.json
AGENTS.append.md
README.md
workflow.md
engineering-best-practices.md
templates/
skills/
roles/project-dev/
```

`workflow.json` declares the workflow name, managed `AGENTS.md` integration,
installed docs, `templatesDir`, `skillsDir`, and `rolesDir`.

## Install Flow

```text
aix workflow install
  -> resolve workflow source
  -> validate workflow.json
  -> refuse second active workflow
  -> preflight docs, skills, roles, templates, and AGENTS block
  -> copy workflow docs into .agents/
  -> insert managed AGENTS.md block
  -> materialize workflow package under .agents/packages/workflows
  -> expose workflow-owned skills under .agents/skills
  -> expose workflow-owned roles under .agents/roles
  -> scaffold missing _docs directories
  -> write manifest workflow intent and lockfile hashes
```

## Update, Diff, And Remove

- `aix workflow diff` compares locked workflow package content with the
  resolved workflow source without changing files.
- `aix workflow update` refreshes package-managed workflow content after drift
  checks pass.
- `aix workflow uninstall` removes package-managed workflow docs, skills,
  roles, templates, and the managed root `AGENTS.md` block after drift checks
  pass. Project-owned `_docs` content remains in place.

## Workflow-Owned Assets

Workflow-owned skills and roles are exposed for the active workflow, but they
are not user-requested root skills or standalone roles. Direct deactivation
refuses to remove them and tells the user to update, replace, or uninstall the
workflow instead.

Workflow origin templates are package-managed. Published templates under
`.agents/templates/` are project-owned overrides and are not rewritten by
workflow update.

## Documentation Scaffolding

New workflow installs create missing project documentation routers and
directories. Current workflow guidance expects:

```text
_docs/
  kb/
  plans/
  plans/backlog/
  plans/completed/
```

If `_docs/design/` exists, it is treated as a preserved migration review
baseline. Agents may read it for comparison, but must not edit, move, delete,
or rewrite its files.
