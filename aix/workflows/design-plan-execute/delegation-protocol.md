# Delegation protocol

This document is shared by the project-manager and every delegated worker.
The PM creates the delegation identity and brief. The worker accepts the
assignment, reports meaningful progress when requested, and publishes a
concise result with evidence. Workers must not rewrite identity, scope,
authority, or terminal state fields.

## Exchange

1. `dispatch`: PM writes `brief.md` and sends the same brief to the worker.
2. `acceptance`: worker confirms the delegation and its IDs.
3. `status`: worker reports `working`, `needs-decision`, or `blocked` when
   useful for the task mode.
4. `result`: worker publishes a bounded summary, evidence pointers, gaps, and
   residual risk. The PM decides whether to accept it.

Questions, decisions, follow-ups, stop requests, and terminal states use the
same delegation and event identity. Every message must include the logical
`subagent_id` and `delegation_id`; the host correlation ID is provider data.

Workers receive only the selected role, relevant guidance, this protocol, a
compact team excerpt, and the current brief. They do not receive the full PM
conversation or unrelated role documents.

## Scheduling and group rationale

The PM derives or validates a task group from the role task mode, dependencies,
write domains, and shared-artifact claims. A caller-provided group ID is only a
candidate; the PM persists the validation rationale and records whether the
assignment was parallelized, queued, serialized, held, or split into its own
group. Shared claims serialize regardless of whether the worker is read-only or
change-producing. Host capacity is reduced by workers already active on the
host, and parent-workspace integration is admitted one worker at a time.

If persisted state is missing, ambiguous, host-lost, conflicted, or contains
unlanded workspace changes, the PM holds the assignment for recovery. Native
host concurrency and worker presentation are host-specific inputs; they do not
override AIX scope, isolation, lock, or cleanup safety rules.
