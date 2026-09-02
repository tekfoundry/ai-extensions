---
name: kanban-create-item
description: Create or refine one lightweight Kanban work item in `_docs/kanban/backlog/` from user intent, including outcome, acceptance criteria, risks, verification notes, and initial state history without starting implementation.
metadata:
  type: skill
version: "1"
---

# Kanban Create Item

Use this skill to capture one new work item or refine one existing backlog item.
This is planning work, not implementation authorization.

## Workflow

1. Read `AGENTS.md`, `.agents/workflow.md`, existing `_docs/kanban/<state>/`
   directories, nearby work items, and current worktree status.
2. Classify the request as Kanban planning before editing.
3. If the requested outcome is unclear, ask only the questions needed to define
   the item, acceptance criteria, priority signal, risks, and verification.
4. Create missing `_docs/kanban/` state directories only when needed:
   `backlog`, `ready`, `in-progress`, `review`, `blocked`, and `done`.
5. Create or update a single work item under `_docs/kanban/backlog/` using the
   active `work-item.md` template when available. If the template is missing,
   use the shape described below.
6. Set the item status to `Backlog` unless the user explicitly asks to make it
   ready and the item meets readiness criteria.
7. Append the initial `State History` row with timestamp, previous state,
   new state, user, and notes.
8. Report the item file, current state, and any open questions. If the user asks
   for the board, summarize the state directories rather than creating a board
   file.

## Work Item Shape

Include:

- title and stable item id when the project has an id convention
- `Status`
- `Priority`
- `Outcome`
- `Context`
- `Acceptance Criteria`
- `Implementation Notes`
- `Verification`
- `Review Notes`
- `State History`
- `Activity`

## Readiness Criteria

An item is ready only when:

- the outcome is small and clear
- acceptance criteria are testable
- obvious blockers are absent or recorded
- verification can be named
- the item can be implemented without inventing material product or safety
  decisions

## Guardrails

- Do not edit implementation files.
- Do not move an item to `In Progress`.
- Do not create large epics when the request can be split into small items.
- Preserve existing item history.
