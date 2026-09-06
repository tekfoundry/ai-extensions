# Workflow troubleshooting

Use this guide when the agent cannot safely advance a plan, task, or gate.
It complements the normative contract in [`workflow.md`](../workflow.md).

| Symptom | Safe response | Resume condition |
| --- | --- | --- |
| Plan is in backlog or inactive | Stop implementation and request explicit Activation approval. | The plan is active and the approval record is durable. |
| Owner, assignment, or packet field is missing | Keep the task `⬜️`, or mark `⚠️` if already started; return the gap to the project-manager. | Ownership and required evidence are recorded. |
| Task has stale marker or missing evidence | Do not infer completion. Record the finding and next action. | Owner supplies transition and verification evidence. |
| Revision conflict or concurrent edit | Preserve both inputs; include `base-revision`; do not overwrite. | Project-manager reconciles, or Boss resolves a scope/gate conflict. |
| Verification fails | Keep `⚠️`; record the exact command/result, risk, and next action. | Targeted verification passes or an approved follow-up is recorded. |
| Boss decision is required | Classify clarification, recommendation, decision, approval, or status; pause only dependent work. | Boss response is recorded when it changes scope, design, acceptance, or risk. |
| Trigger is ambiguous | Return matched intents and ask for clarification. | One canonical intent and context are selected. |
| Unexpected user edit or unsafe operation | Stop and preserve the edit; never regenerate, overwrite, delete, or publish by guesswork. | Project-manager confirms a bounded safe action. |

A trigger, worker assignment, test result, or quoted conversation cannot
activate a plan, approve a human gate, waive a finding, publish, or archive.
