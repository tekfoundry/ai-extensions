---
applies_to:
  roles:
    - project-manager
---

# Project Manager Workflow Guidance

Use this companion guidance when the project-manager role routes work in a
project that follows an AIX workflow lifecycle.

Treat active plans in `_docs/plans/` as implementation authorization. Treat
backlog plans as planning context only unless the developer explicitly asks to
activate them. Keep the active plan as the execution record, and keep
durable current-state behavior in `_docs/kb`.

When the request names a lifecycle skill, route by the work being performed,
not by the skill name alone. Skills are procedures selected by roles. For
example, phase execution usually involves `implementation-engineer` first and
`quality-engineer` before completion evidence is accepted.

Load workflow activity guidance only when it matches the startup activity list
or when a selected delegated role's guidance points to it.
