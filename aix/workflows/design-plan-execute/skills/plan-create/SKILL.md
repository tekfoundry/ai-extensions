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

## Role Collaboration

`plan-create` owns the planning procedure and the backlog plan artifact. Roles
can supply bounded specialist judgment, but they do not own template
resolution, file placement, lifecycle state, accepted gates, final task
breakdown, or user-facing handoff.

When `.agents/roles/product-strategist.md` exists and the plan needs stronger
vision, audience, value, scope, tradeoff, sequencing, or product-fit judgment,
use `delegate-to-role` or a prompt-overlay delegation to request a bounded
product-strategy pass. Fold the returned evidence into `Context`,
`High-Level Goal`, open questions, risks, and later scope boundaries as
appropriate.

Do not require `product-strategist` for direct use. If the role is unavailable
or the host cannot delegate, continue the planning session yourself by asking
concise product-vision questions and recording the answers in the living plan.

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
   should use the active workflow `plan.md` template when available and a
   status that clearly means plan creation, review, and approval are not
   complete yet, such as `📝 Planning Draft`.
5. Use the plan document as the living planning record. Keep it current as the
   goal, design intent, questions, phases, tasks, risks, verification, lessons,
   and promotion notes evolve. Do not fill every template section
   speculatively. When a later section is not accepted yet, leave it clearly
   pending rather than drafting work against unstable intent.
6. Run the vision gate first. Relentlessly clarify the high-level goal until
   both the agent and user agree on the product intent. Focus this stage on
   the "what" and "why"; avoid prematurely committing to the "how" unless it
   constrains the goal. Use `product-strategist` for a bounded vision pass when
   that role is installed and product strategy would materially improve the
   plan.
7. Record acceptance on the `High-Level Goal` heading only after the user
   agrees that the vision, audience, value, and scope direction are clear
   enough to continue.
8. After the high-level goal is accepted, run the design-intent gate. Translate
   the accepted goal into design intentions that describe the intended
   implementation shape, tradeoffs, boundaries, interfaces, data and safety
   posture, verification needs, rollout considerations, non-goals, and open
   decisions.
9. Iterate on design intent until the user explicitly agrees that it captures
   the desired direction. Do not generate implementation phases or task lists
   before Design Intent is accepted.
10. Only after Design Intent is accepted, break it into ordered implementation
   phases with concrete tasks. Prefer phases that support iterative
   development, verification, and review over one large all-or-nothing phase.
11. Apply the task status markers from `.agents/workflow.md` to every phased
   task list. New backlog tasks should start with `⬜️`; use `🟨`, `✅`, and
   `⚠️` only when the plan is recording actual execution state or a known
   validation gap.
12. Lead the user through a phase-by-phase review. For each phase, ask for
   sign-off or requested changes before treating that phase as accepted.
13. As each gate is accepted, record that acceptance inline on the relevant
   section or phase heading, such as
   `## Design Intent (status: accepted)` or
   `### Phase 1: Name (status: accepted)`.
14. Once all phases and tasks are accepted, update the plan status to indicate
   the backlog plan is ready for later activation, such as `💤 Backlog`. Do not
   leave a detached review-gates section in the final accepted plan.
15. Place every newly created implementation plan in `_docs/plans/backlog/`.
   Moving a plan to `_docs/plans/` requires a later explicit `plan-activate`
   request from the user.

## Planning Gates

Require explicit user agreement before moving past these gates:

- Vision gate: `Context` and `High-Level Goal` are clear enough to continue.
- High-level goal agreed.
- Design intent agreed.
- Each implementation phase and its tasks agreed.
- Final backlog plan accepted.

If the user changes an earlier decision, update the living plan and revisit any
later sections affected by that change.

## Living Plan Shape

Use the active workflow `plan.md` template when available. Otherwise use the
repository's existing plan style, and include sections that preserve unfinished
planning work without pretending it is final:

- `Status`: use `📝 Planning Draft` until final plan acceptance, then `💤 Backlog`.
- `Context`: current understanding, relevant docs reviewed, and why the work
  matters.
- `High-Level Goal`: the agreed "what" and "why".
- `Design Intent`: the accepted implementation direction and boundaries.
- `Non-Goals` and `Boundaries And Invariants` when they materially reduce
  ambiguity or risk.
- `Implementation Phases`: before Design Intent is accepted, keep this section
  as a clear placeholder such as `Not drafted until Design Intent is accepted`.
  After Design Intent is accepted, replace the placeholder with ordered phases
  containing concrete tasks, success goals, and verification. Use the workflow
  task status markers directly in task lists: `⬜️` not started, `🟨` in
  progress, `✅` completed, and `⚠️` implemented or substantially complete with
  a known validation gap or follow-up risk.
- `Open Questions / Decisions`: unresolved questions, deferred "wait and see"
  decisions, and the point in execution when each must be revisited.
- `Risks`: especially data-safety, credentials, file operations,
  external-system, publishing, persistence, runtime-contract, and rollout risks.
- `Lessons To Carry Forward` and `Promotion To Design` when relevant.

Resolve `plan.md` from `.agents/templates/plan.md` first, then from the active
workflow origin under `.agents/packages/workflows/<source>/<workflow>/templates/`.
If neither exists, continue with the structure above and report the missing
template.

For accepted backlog plans, place acceptance state in the section and phase
headings, for example:

```text
## High-Level Goal (status: accepted)
## Design Intent (status: accepted)
### Phase 1: CLI foundation (status: accepted)
```

Do not use a final `Review Gates` section as the lasting acceptance record.

## Guardrails

- Keep user intent and accepted design decisions separate from implementation
  history.
- Do not use Markdown task checkboxes such as `- [ ]` or `- [x]` for plan
  tasks. Use the status markers from `.agents/workflow.md` so task state is
  visible and consistent across backlog and active plans.
- Do not create active plans directly. Backlog review is the required pause
  before implementation authorization.
- Do not generate implementation phases or task lists against unaccepted Design
  Intent. Record placeholders and open questions instead.
- Do not invent material behavior when the request or repository context is
  insufficient.
- Identify data-safety, credentials, external-system, publishing, persistence,
  and runtime-contract risks before implementation is authorized.
- Questions should earn their keep: ask about product intent, scope,
  architecture, safety, interfaces, verification, or rollout. Avoid trivia, but
  keep asking when an answer is needed to produce a decision-complete plan.
- Open questions may remain in the final backlog plan only when they are
  intentionally deferred and the plan states when they must be resolved.
