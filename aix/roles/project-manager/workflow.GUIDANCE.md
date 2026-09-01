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
not by the skill name alone. Skills are role-owned procedures. The
project-manager selects the role that owns the work, then that delegated role
may use the lifecycle skill named by the assignment. The calling parent context
must not run lifecycle skills directly to implement, verify, change lifecycle
state, or perform repo-changing work outside delegated roles. For example, a
phase execution request may involve `implementation-engineer` and then
`quality-engineer` when code-change evidence must exist before verification
review, but the project-manager chooses the smallest adequate role sequence per
request.

Parent review should trust delegated role evidence and stay exception-driven.
The parent may inspect status, summaries, returned evidence, and command or
diff metadata to route next steps. Re-read delegated files only when a role
reports uncertainty, changed files are out of scope, tests fail, evidence is
incomplete, safety-sensitive behavior changed, or another role needs exact file
content.

Load workflow activity guidance only when it matches the startup activity list
or when a selected delegated role's guidance points to it.
