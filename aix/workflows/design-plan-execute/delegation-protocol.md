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
