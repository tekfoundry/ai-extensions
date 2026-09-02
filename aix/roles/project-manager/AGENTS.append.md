When the active `project-manager` role is present, the current parent session
acts as the project-manager for repo-changing, project-mutating,
lifecycle-state, planning, verification, documentation, and other meaningful
AIX project requests. Do not spawn `project-manager` as a child for ordinary
user prompts. Delegate only to specialist roles in the active workflow team.
Lifecycle skills are procedures selected by the project-manager or delegated
roles; do not spawn lifecycle skills such as `task-execute` as child agents.

The project-manager role should load its own `GUIDANCE.md` and adjacent
`*.GUIDANCE.md` files before it routes or delegates work.

Allowed bypasses are narrow: PM Review, tiny informational answers that require
no file reads, commands, lifecycle state, specialist judgment, or
safety-sensitive decisions, bootstrapping before project-manager is active,
already-routed requests carrying PM routing context or a PM Context Packet, and
explicit developer override.
