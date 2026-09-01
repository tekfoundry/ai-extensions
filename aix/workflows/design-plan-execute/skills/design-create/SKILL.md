---
name: design-create
description: Create a new current-state knowledge-base document in the right _docs/kb area, using workflow kb templates and linking it from the relevant index. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active.
---

# Design Create

Use this skill when a new durable current-state knowledge-base document is
needed. Prefer updating an existing `_docs/kb` document when the topic already
has a clear home.

## Project-Manager Entry Gate

When the active `project-manager` role is present, repo-changing,
project-mutating, lifecycle-state, planning, verification, documentation, or
other meaningful AIX project requests should reach this skill only after
project-manager routing and only when the project-manager or a delegated
role selects it as the procedure for bounded work.
Lifecycle skills are role-owned procedures, not default
direct request entrypoints.

If a direct user request or parent-context continuation reaches this skill
without PM routing context or a PM Context Packet, stop and route through
project-manager first. A parent context that received a PM Context Packet may
route, preserve worktree safety, review returned evidence, and report results;
parent review is minimal and exception-driven, trusting delegated role evidence
unless uncertainty, out-of-scope changes, failed tests, incomplete evidence,
safety-sensitive changes, or another role's need for exact file content gives a
concrete reason to re-read files. It must not run this lifecycle skill itself
to implement, verify, change lifecycle state, or perform repo-changing work
outside the delegated role.

Allowed bypasses are PM Review, tiny informational requests that require no
file reads, commands, lifecycle state, specialist judgment, or safety-sensitive
decisions, bootstrapping before project-manager is active, already-routed
requests carrying PM routing context or a PM Context Packet, and explicit
developer override.

## Role Collaboration

`design-create` owns the knowledge-base document, placement decision, template
use, index links, and user-facing handoff. Roles can supply bounded specialist
judgment, but they do not own final current-state truth or promote speculative
architecture.

When `.agents/roles/technical-architect/ROLE.md` exists and the knowledge-base document
concerns system shape, component boundaries, module ownership, runtime
contracts, integration choices, data flow, persistence, package-management
behavior, workflow lifecycle behavior, or maintainability tradeoffs, use
`delegate-to-role` or a prompt-overlay delegation to request bounded
architecture input.

Fold returned evidence into the knowledge-base document's current-state behavior,
ownership boundaries, invariants, constraints, tradeoffs, related-doc links,
or unresolved gaps as appropriate. Do not require `technical-architect` for
direct use. If the role is unavailable or the host cannot delegate, continue
the knowledge-base document creation yourself by checking the same architecture
concerns.

When `.agents/roles/product-designer/ROLE.md` exists and the knowledge-base document
concerns product-facing behavior, user flows, interaction states,
accessibility, layout hierarchy, prototypes, terminal UX, prompts, or
design-system fit, use `delegate-to-role` or a prompt-overlay delegation to
request bounded product-design input.

Fold returned evidence into the knowledge-base document's current-state behavior,
user-flow expectations, interaction states, accessibility and usability
constraints, layout or hierarchy notes, related-doc links, human-review notes,
or unresolved gaps as appropriate. Do not require `product-designer` for direct
use. If the role is unavailable or the host cannot delegate, continue the
knowledge-base document creation yourself by checking the same product-design
concerns.

When `.agents/roles/ux-writer/ROLE.md` exists and the knowledge-base document records
durable product or developer-facing language, use `delegate-to-role` or a
prompt-overlay delegation to request bounded UX writing input. Good triggers
include terminology, labels, prompts, command help, terminal output, errors,
empty states, onboarding copy, README language, workflow instructions, or
message-state requirements.

Fold returned evidence into the knowledge-base document's current-state behavior,
terminology, message-state expectations, copy constraints, related-doc links,
human-review notes, or unresolved gaps as appropriate. Do not require
`ux-writer` for direct use. If the role is unavailable or the host cannot
delegate, continue the knowledge-base document creation yourself by checking the same
copy, terminology, reader, task, and recovery-path concerns.

When `.agents/roles/documentation-specialist/ROLE.md` exists and the knowledge-base
document placement, ownership, index coverage, related-doc links,
current-state accuracy, or separation between stable truth and plan history is
material, use `delegate-to-role` or a prompt-overlay delegation to request
bounded documentation input.

Fold returned evidence into the knowledge-base document's placement decision,
current-state behavior, related-doc links, index updates, ownership boundary,
promotion notes, human-review notes, or unresolved gaps as appropriate. Do not
require `documentation-specialist` for direct use. If the role is unavailable
or the host cannot delegate, continue the knowledge-base document creation yourself by
checking the same documentation structure, placement, link, and current-state
accuracy concerns. Do not use the role to create a new doc when a focused
update to an existing doc is clearer.

## Workflow

1. Read `_docs/README.md` and `_docs/kb/README.md` to understand the
   current documentation map and ownership rules.
2. Decide the smallest appropriate home under `_docs/kb/`, such as product,
   requirements, architecture, security, quality, operations, decisions, or
   glossary.
3. Check nearby docs before creating a new file. Update an existing document
   when that keeps ownership clearer.
4. When creating a new file, use the workflow `kb/*` template that best fits
   the document type when one exists.
5. Write current-state knowledge. Cover behavior, ownership boundaries,
   constraints, evidence, failure modes, and links to related docs. Keep plan
   history in plans.
6. Link the new or moved document from the relevant index, usually
   `_docs/kb/README.md` or an area `README.md`.
7. Report created or updated docs, index changes, unresolved gaps, and whether
   the template was missing.

## Guardrails

- Do not create a new knowledge-base document when a focused update to an
  existing doc is clearer.
- Do not promote speculative, rejected, or unimplemented behavior as current
  knowledge.
- Do not copy an implementation plan into `_docs/kb/`.
- Keep one document responsible for one coherent topic.
- Preserve project-owned documentation and unrelated edits.
