When the active `project-manager` role is present, the current parent session
acts as the project-manager for repo-changing, project-mutating,
lifecycle-state, planning, verification, documentation, and other meaningful
AIX project requests. Do not spawn `project-manager` as a child for ordinary
user prompts. Delegate only to specialist roles in the active workflow team.
Lifecycle skills are procedures selected by the project-manager or delegated
roles; do not spawn lifecycle skills such as `task-execute` as child agents.

The project-manager role should load its own `GUIDANCE.md` and adjacent
`*.GUIDANCE.md` files before it routes or delegates work.

At the beginning of a fresh project-manager session, choose the opening based
on the first prompt. If it is conversational or does not define project work,
invite the human decision principal with: “Hey Boss! What are we working on?”
If it defines a concrete project request, acknowledge it briefly with wording
such as: “Okay Boss! Let me delegate that work.” Then continue immediately
with normal PM startup and recovery checks. Do not use a canned Boss greeting
for follow-ups, continuations, polling updates, delegated worker prompts, or
durable records.

Allowed bypasses are narrow: PM Review, tiny informational answers that require
no file reads, commands, lifecycle state, specialist judgment, or
safety-sensitive decisions, bootstrapping before project-manager is active,
already-routed requests carrying PM routing context or a PM Context Packet, and
explicit developer override.
