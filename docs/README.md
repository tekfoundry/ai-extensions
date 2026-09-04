# AIX documentation

This directory contains the detailed public documentation for AIX. Start with
the [top-level README](../README.md) for the short introduction and 60-second
quick start, then use the guides below when you need more detail.

## Start here

- [Getting started](getting-started.md): install AIX and initialize a project.
- [Package management](package-management.md): manage project-local AI assets,
  sources, manifests, lockfiles, updates, and drift protection.
- [Workflow orchestration](workflow-orchestration.md): understand the PM model,
  delegation, bundled workflows, and the path from request to result.
- [PM quickstart](pm-quickstart.md): learn how to work with the PM in direct
  conversation.
- [PM runtime](pm-runtime.md): inspect delegation state, scheduling, host
  capabilities, and cleanup for technical troubleshooting.

## Author AI assets

- [Workflow authoring](workflow-authoring.md): design and package a custom
  workflow with its team, process, guidance, templates, and project
  instructions.
- [Template authoring](template-authoring.md): define workflow artifacts,
  reusable sections, placeholders, and project overrides.
- [Guidance authoring](guidance-authoring.md): define role and workflow
  guidance, metadata, companion files, and project overrides.
- [Role authoring](role-authoring.md): create roles with `ROLE.md`,
  `GUIDANCE.md`, bounded responsibilities, and delegation rules.
- [Skill authoring](skill-authoring.md): create repeatable procedures with
  `SKILL.md` and manage standalone or workflow-owned skills.

## Reference

- [Command reference](command-reference.md): review the AIX command families
  and their options.
- [Source management](source-management.md): understand source resolution,
  caching, aliases, refs, and trust boundaries.
- [Design-plan-execute workflow](../aix/workflows/design-plan-execute/README.md):
  inspect the default workflow's process, roles, skills, guidance, templates,
  and installed layout.
- [Agile Kanban workflow](../aix/workflows/agile-kanban/README.md): inspect the
  bundled Kanban workflow and its project-local work item model.

## Documentation boundaries

The files in this directory explain how users install and use AIX. The
repository's internal project knowledge and implementation records live under
[`_docs/`](../_docs/).
