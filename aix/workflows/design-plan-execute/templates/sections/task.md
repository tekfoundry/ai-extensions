<!-- DO NOT INCLUDE IN OUTPUT
Agent note: task:status must render as exactly one marker:
⬜️ not started
🟨 in progress
✅ completed
⚠️ validation gap or follow-up risk
Render only the marker before the title, for example:
- ✅ Add CLI routing for `aix templates list`.
Never render words such as "not started -". -->
- {{ task:status }} {{ task:title }}
  <!-- DO NOT INCLUDE IN OUTPUT
Agent note: Task metadata (owner is required; render other fields only when applicable):
  Owner: <accountable-role>
  Collaborators: <role-list>
  Assignment: <worker-or-run-id>
  Validation: <validation-result>
  Completed-at: <UTC-timestamp>
  Evidence: <evidence-reference>
  Conditional metadata: <dependencies, docs impact, residual risk, or other key-value data>
  -->
