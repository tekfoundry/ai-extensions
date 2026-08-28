# Roles And Templates Architecture

## Role Package Shape

Roles are directory bundles with a `ROLE.md` entrypoint containing YAML front
matter and body instructions. Bundled AIX and workflow-owned role bundles also
include `GUIDANCE.md` for role-specific best-practice judgment. External
standalone role bundles may omit guidance. Standalone role package directories
live under:

```text
.agents/packages/roles/<source>/<source-path>
```

Active role entrypoints live under:

```text
.agents/roles/<active-name>/ROLE.md
```

Active role guidance lives beside the entrypoint when present:

```text
.agents/roles/<active-name>/GUIDANCE.md
```

Workflow-owned role source files are discovered from `roles/project-dev/`
inside a workflow package and activated with workflow owner metadata.

## Workflow-Owned Role Shape

Workflow-owned roles are shipped inside a workflow package instead of a
standalone role source. The current workflow role source convention is:

```text
<workflow-package>/roles/project-dev/<role-name>/ROLE.md
<workflow-package>/roles/project-dev/<role-name>/GUIDANCE.md
```

After workflow install, the same role is represented in three places:

```text
package source:
  .agents/packages/workflows/<workflow-source>/<workflow-name>/roles/project-dev/<role-name>/ROLE.md
  .agents/packages/workflows/<workflow-source>/<workflow-name>/roles/project-dev/<role-name>/GUIDANCE.md

active role:
  .agents/roles/<role-name>/ROLE.md
  .agents/roles/<role-name>/GUIDANCE.md

lockfile entry:
  roles[] entry with owner.kind = "workflow" and owner.name = <workflow-name>
```

Workflow-owned roles do not create standalone manifest role requests. They are
installed, updated, and removed by the workflow lifecycle. Standalone role
commands must reject direct management of those roles and route the user to
workflow update, replacement, or uninstall.

## Role Validation

Role activation validates:

- source target shape
- role front matter
- required `name`
- required `description`
- valid lowercase hyphenated role name
- contract sections when required
- bundled role guidance presence when the role is shipped by AIX or a workflow
- optional `uses_guidance` metadata shape in `GUIDANCE.md`
- filename/name agreement
- active role name or alias
- active-name collisions
- package and active file drift

Role `skills` metadata is parsed as a runtime hint. It is not a dependency
resolver and does not install skills.

## Role Lifecycle

```text
aix role activate <source/path> [alias]
  -> normalize source target to a role bundle directory
  -> resolve local or Git role source
  -> parse and validate ROLE.md
  -> parse optional GUIDANCE.md metadata
  -> preflight lockfile collisions and drift
  -> copy package role bundle
  -> write active role bundle
  -> update manifest role request
  -> upsert lockfile role entry
```

`ROLE.md` is package-managed role behavior. Active `GUIDANCE.md` is
project-editable after activation. Updates preserve edited active role
guidance and make upstream guidance changes visible through diff or reset
flows instead of overwriting local edits silently.

Standalone role update and diff accept either an active name or a source/path
target. Workflow-owned roles are filtered out of standalone management and must
move through the workflow lifecycle.

## Guidance Lifecycle

Guidance is reusable judgment. It does not replace role contracts, skill
procedures, workflow lifecycle rules, templates, plans, or `_docs/kb`.

Workflow activity guidance lives under the active workflow package:

```text
.agents/packages/workflows/<source>/<workflow>/guidance/
  README.md
  shared.md
  activities/<activity-name>.md
```

Projects publish editable workflow guidance overrides under:

```text
.agents/guidance/
  shared.md
  activities/<activity-name>.md
```

Guidance resolution is published-first for workflow guidance:

```text
.agents/guidance/<name>.md
  else .agents/packages/workflows/<source>/<workflow>/guidance/<name>.md
```

Role guidance follows active role bundle ownership instead. Activating a role
copies `GUIDANCE.md` into `.agents/roles/<active-name>/GUIDANCE.md` when the
role provides guidance, and that active guidance is editable. AIX still keeps
the package-origin guidance so diff and reset can compare or restore it.

The public guidance command family aggregates workflow and role guidance:

```bash
aix guidance list
aix guidance publish
aix guidance diff [guidance-name]
aix guidance reset <guidance-name|--all>
```

Command-ready names are path-like: `shared`, `activities/<activity-name>`, and
`roles/<role-name>`. Guidance metadata such as `applies_to` and
`uses_guidance` is advisory. It helps humans and resolver skills choose
relevant reading, but it is not dependency resolution and does not trigger
file mutation.

The bundled `get-guidance` skill is an optional read-only resolver. It can
return a bounded reading list for a requesting role, requesting skill,
activity, and task context. It is not wired into managed `AGENTS.md`,
workflow manifests, `delegate-to-role`, role contracts, skill contracts, or
default startup routing. Future request-entry behavior belongs to the
project-manager plan, and automatic workflow activation of external resolver
skills depends on the external workflow skill dependency plan unless that
future design changes.

## Role Delegation Runtime

The role delegation helper resolves explicit user intent in natural language.
It recognizes prompts such as `use quality-engineer`, `delegate to
documentation-specialist`, or `ask technical-architect`.

Resolution rules:

- Exactly one explicit role target may resolve.
- Missing explicit targets fail clearly.
- Multiple mentioned roles are ambiguous and fail clearly.
- Implicit role mentions without delegation intent do not route.
- Current delegation mode is `prompt-overlay`.

The built prompt overlay includes selected role metadata, parent-owned
boundaries, the bounded task, the role operating prompt, and required return
evidence. It does not create host-native agent files.

## Workflow Template Shape

Workflow templates are Markdown files under a workflow package `templates/`
directory. A template is either:

- a document template
- a section template under `templates/sections/`

Template names must use safe path segments. Template files are discovered
recursively and sorted for stable output.

## Template Syntax Contract

Supported template references are intentionally narrow:

- `{{ section:name }}`
- `{{ repeat:path.to.items section:name }}`
- inert placeholders shaped like `{{ namespace:value }}`

Unsupported template language features such as loops, conditionals, `else`, or
pipe filters are rejected. Section and repeat references must point to an
existing section template.

AIX validates template syntax and references when installing or updating a
workflow. AIX does not render templates during package installation.

## Published Template Overrides

Published template overrides live under `.agents/templates/` and mirror the
workflow template path without the leading `templates/` segment.

```text
workflow origin:
  .agents/packages/workflows/aix/design-plan-execute/templates/plan.md

published override:
  .agents/templates/plan.md

section origin:
  .agents/packages/workflows/aix/design-plan-execute/templates/sections/task.md

published override:
  .agents/templates/sections/task.md
```

Published-first resolution is a workflow contract used by installed workflow
guidance and skills:

```text
.agents/templates/<name>.md
  else .agents/packages/workflows/<source>/<workflow>/templates/<name>.md
```

Publishing writes the complete template set. If an override already exists and
matches origin, it is left unchanged. If an override exists and differs, AIX
refuses to overwrite it.

Diff compares published overrides against workflow origins. Reset deletes one
or all published overrides and removes empty template directories.

## Architectural Invariants

- Roles are file packages; skills are directory packages.
- Active role files are never symlinks in the current implementation.
- Workflow-owned roles are lockfile entries with workflow owner metadata.
- Template origins are package-managed and hash-checked.
- Published templates are project-owned overrides and are not lockfile-tracked
  as accepted package state.
- Template validation rejects unsupported syntax before workflow install/update
  mutates the final workflow package.
- Role guidance stays inside the role bundle boundary; workflow activity
  guidance stays inside the workflow boundary until published as a project
  override.
- Guidance metadata is advisory and must not install, activate, update, reset,
  or route agent work by itself.
