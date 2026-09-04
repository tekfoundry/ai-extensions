# Author workflow templates for AIX

A workflow template gives agents a reusable structure for plans, designs, work
items, knowledge-base documents, and other artifacts. Templates belong to a
workflow because the workflow defines the process and the artifacts that
support it.

## Template structure

Declare a templates directory in `workflow.json`:

```json
{
  "templatesDir": "templates"
}
```

Store document templates directly under that directory. Store reusable section
templates under `sections/`:

```text
templates/
  plan.md
  design-doc.md
  sections/
    phase.md
    task.md
```

AIX tracks document templates and section templates separately. Template names
may contain letters, numbers, periods, underscores, hyphens, and nested paths.

## Template placeholders

AIX validates three kinds of placeholders:

```md
{{ plan:title }}
{{ section:task }}
{{ repeat:phases section:phase }}
```

- A regular placeholder such as `{{ plan:title }}` marks a workflow-defined
  value.
- A section reference inserts one named section template.
- A repeat reference applies a section template to a collection.

Section references must point to an existing file under `templates/sections/`.
AIX rejects unsupported template control syntax, including conditionals,
loops, and filter expressions. Keep logic in the workflow skill that renders
the artifact, not in the template itself.

## Authoring guidance

Keep a template focused on the artifact's structure. Explain important status
markers or authoring rules in comments that the agent can read while creating
the artifact. Define the sections that every artifact needs, and use section
templates when the same structure appears repeatedly.

Templates should make workflow state visible. For example, a plan template can
include design-intent status, implementation phases, verification evidence,
risks, and documentation impact. A task template can require a bounded scope,
expected result, and verification note.

The bundled
[`design-plan-execute templates`](../aix/workflows/design-plan-execute/templates/)
provide complete examples for plans, designs, product summaries, knowledge
base documents, and reusable sections.

## Publish and maintain templates

Workflow templates remain package-owned until a project publishes editable
copies:

```bash
aix templates list
aix templates publish
aix templates diff
aix templates diff plan
aix templates reset plan
aix templates reset --all
```

Published templates live under `.agents/templates/`. `publish` exposes the
active workflow templates for project editing. `diff` compares published files
with their workflow origins. `reset` removes a project override and restores
the package-owned version.

AIX refuses to overwrite a locally edited published template and checks
template hashes during workflow update and uninstall. Update or uninstall the
owning workflow when a workflow-owned template needs to change.

