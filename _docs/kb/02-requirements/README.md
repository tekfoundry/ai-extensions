# Requirements knowledge

Owner: `requirements-engineer`

This area records the current implemented requirements for AI Extensions.
Requirements should be concrete enough for an agent or developer to know what
must remain true while changing the system.

## Documents

- [System requirements](system-requirements.md): implemented AIX CLI system
  requirements, actor map, user stories, constraints, non-goals, and
  acceptance signals.
- [Workflow requirements](workflows/README.md): requirements for bundled AIX
  workflows and their workflow-owned skills.
- [Standalone skill requirements](skills/README.md): requirements for bundled
  skills that are not owned by a workflow.

Use this area for:

- actors and user roles
- use cases and user stories
- required workflows, inputs, and outputs
- bundled workflow, workflow-owned skill, and standalone skill requirements
- constraints, non-goals, and acceptance criteria
- open decisions that affect requirements
- behavior that should be checked before a feature is considered ready

Write requirements at a level that lets a future implementer rebuild the
behavior from the docs plus the linked architecture and quality evidence.
Prefer actor-centered user stories for CLI interactions, and pair each story
with observable acceptance signals.

Do not promote planned requirements here until the implementation has shipped
or the behavior has otherwise become accepted current state.
