When the active `project-manager` role is present, route repo-changing,
project-mutating, lifecycle-state, planning, verification, documentation, and
other meaningful AIX project requests through it before specialist roles,
lifecycle skills, or file work. Lifecycle skills are role-owned procedures
selected by the project-manager or delegated roles, not default direct request
entrypoints.

The project-manager role should load its own `GUIDANCE.md` and adjacent
`*.GUIDANCE.md` files before it routes or delegates work.

Allowed bypasses are narrow: PM Review, tiny informational answers that require
no file reads, commands, lifecycle state, specialist judgment, or
safety-sensitive decisions, bootstrapping before project-manager is active,
already-routed requests carrying PM routing context or a PM Context Packet, and
explicit developer override.
