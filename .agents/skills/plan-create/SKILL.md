---
name: plan-create
description: Start and refine a backlog implementation plan from user intent, repository context, and explicit success criteria. Use when a user asks to plan-create, create, draft, or turn an idea into a plan; always place new plans under `_docs/plans/backlog/` for developer review before activation.
---

# Plan Create

Use this skill to turn an initial request into a decision-complete backlog
plan through a collaborative technical-design process. This is a planning
workflow; do not implement the proposed work unless the user explicitly
activates the backlog plan afterward.

Act as a technical design partner. Lead the user from a high-level product
goal into implementation-ready design intent and phased work, but keep the
conversation grounded in explicit user agreement at each major step.

## Workflow

1. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, and related active or backlog plans. Read completed plans only
   when specific historical decisions, regressions, or migrations are relevant
   to the requested plan.
2. Classify the work as backlog planning unless it is clearly a micro-fix.
   Do not promote backlog work autonomously.
3. If the user has not already provided a high-level goal, ask them to
   summarize the goal in terms of what they want and why it matters. Do not
   require them to know the implementation approach yet.
4. Create the backlog plan document early, after the first goal summary is
   available, so planning work is retained as it evolves. The initial document
   should use a status that clearly means plan creation, review, and approval
   are not complete yet, such as `📝 Planning Draft`.
5. Use the plan document as the living planning record. Keep it current as the
   goal, design intent, questions, phases, tasks, risks, verification, lessons,
   and promotion notes evolve.
6. Relentlessly clarify the high-level goal until both the agent and user agree
   on the product intent. Focus this stage on the "what" and "why"; avoid
   prematurely committing to the "how" unless it constrains the goal.
7. After the goal is agreed, translate it into design intentions that describe
   the intended implementation shape, tradeoffs, boundaries, interfaces, data
   and safety posture, verification needs, and rollout considerations.
8. Iterate on design intent until the user explicitly agrees that it captures
   the desired direction.
9. Break the accepted design intent into ordered implementation phases with
   concrete tasks. Prefer phases that support iterative development,
   verification, and review over one large all-or-nothing phase.
10. Lead the user through a phase-by-phase review. For each phase, ask for
   sign-off or requested changes before treating that phase as accepted.
11. Once all phases and tasks are accepted, update the plan status to indicate
   the backlog plan is ready for later activation, such as `💤 Backlog`.
12. Place every newly created implementation plan in `_docs/plans/backlog/`.
   Moving a plan to `_docs/plans/` requires a later explicit `plan-activate`
   request from the user.

## Planning Gates

Require explicit user agreement before moving past these gates:

- High-level goal agreed.
- Design intent agreed.
- Each implementation phase and its tasks agreed.
- Final backlog plan accepted.

If the user changes an earlier decision, update the living plan and revisit any
later sections affected by that change.

## Living Plan Shape

Use the repository's existing plan style, and include sections that preserve
unfinished planning work without pretending it is final:

- `Status`: use `📝 Planning Draft` until final plan acceptance, then `💤 Backlog`.
- `Context`: current understanding, relevant docs reviewed, and why the work
  matters.
- `High-Level Goal`: the agreed "what" and "why".
- `Design Intent`: the accepted implementation direction and boundaries.
- `Non-Goals` and `Boundaries And Invariants` when they materially reduce
  ambiguity or risk.
- `Implementation Phases`: ordered phases with concrete tasks, success goals,
  and verification.
- `Open Questions / Decisions`: unresolved questions, deferred "wait and see"
  decisions, and the point in execution when each must be revisited.
- `Risks`: especially data-safety, credentials, file operations,
  external-system, publishing, persistence, runtime-contract, and rollout risks.
- `Lessons To Carry Forward` and `Promotion To Design` when relevant.

## Guardrails

- Keep user intent and accepted design decisions separate from implementation
  history.
- Do not create active plans directly. Backlog review is the required pause
  before implementation authorization.
- Do not invent material behavior when the request or repository context is
  insufficient.
- Identify data-safety, credentials, external-system, publishing, persistence,
  and runtime-contract risks before implementation is authorized.
- Questions should earn their keep: ask about product intent, scope,
  architecture, safety, interfaces, verification, or rollout. Avoid trivia, but
  keep asking when an answer is needed to produce a decision-complete plan.
- Open questions may remain in the final backlog plan only when they are
  intentionally deferred and the plan states when they must be resolved.
