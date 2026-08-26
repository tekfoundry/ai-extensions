# Roles And Templates Architecture

## Role Package Shape

Roles are single Markdown files with YAML front matter and body instructions.
Standalone role package files live under:

```text
.agents/packages/roles/<source>/<source-path>
```

Active role files live under:

```text
.agents/roles/<active-name>.md
```

Workflow-owned role source files are discovered from `roles/project-dev/`
inside a workflow package and activated with workflow owner metadata.

## Workflow-Owned Role Shape

Workflow-owned roles are shipped inside a workflow package instead of a
standalone role source. The current workflow role source convention is:

```text
<workflow-package>/roles/project-dev/<role-name>.md
```

After workflow install, the same role is represented in three places:

```text
package source:
  .agents/packages/workflows/<workflow-source>/<workflow-name>/roles/project-dev/<role-name>.md

active role:
  .agents/roles/<role-name>.md

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
- filename/name agreement
- active role name or alias
- active-name collisions
- package and active file drift

Role `skills` metadata is parsed as a runtime hint. It is not a dependency
resolver and does not install skills.

## Role Lifecycle

```text
aix role activate <source/path> [alias]
  -> parse target and add .md when omitted
  -> resolve local or Git role source
  -> parse and validate role file
  -> preflight lockfile collisions and drift
  -> copy package role file
  -> write active role file
  -> update manifest role request
  -> upsert lockfile role entry
```

Standalone role update and diff accept either an active name or a source/path
target. Workflow-owned roles are filtered out of standalone management and must
move through the workflow lifecycle.

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
