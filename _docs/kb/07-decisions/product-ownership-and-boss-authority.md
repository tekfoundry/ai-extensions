# Product Ownership And Boss Authority

## Accepted decision

The `design-plan-execute` workflow uses `product-owner` as its product-
decision role and `release-engineer` as its bounded delivery and release-
platform role. `product-owner` includes the former product-strategy
responsibilities: idea generation and evaluation, audience fit, user value,
scope, tradeoffs, prioritization, and sequencing. It adds backlog ordering,
actionable item shaping, acceptance criteria, refinement and planning,
delivery-time clarification, and product-level acceptance evaluation.

`release-engineer` is an experienced or senior DevOps role responsible for
delivery-system reliability, CI, builds, package and artifact validation,
supported-host integration, compatibility, diagnostics, and safe release
automation. Publishing, registry changes, global installation, unrestricted
external release actions, and raw credential handling require separate
authorization.

## Human decision principal

Boss is the human decision principal outside the delegated-role roster and
worker lifecycle. Boss retains product decisions, priorities, risky approvals,
exceptions, final acceptance, and release decisions. The PM coordinates work
for Boss and delegates bounded analysis or implementation to specialists; Boss
is not dispatched as a worker and does not appear as a delegation-record
identity.

The direct conversational contract is asymmetric by design. Boss may refer to
the active project manager as `pm`, `project manager`, `manager`, or
`project-manager`, with any casing. The PM normalizes those aliases to the
single active PM role and addresses the human as “Boss” in direct responses.
That conversational address does not enter worker prompts, status events,
delegation IDs, or other machine-readable records.

## Migration consequence

`product-strategist` is legacy terminology for this workflow. Existing state
must migrate transactionally or refuse clearly when edited files, ownership
ambiguity, or collisions prevent safe replacement. The roster, manifest,
lockfile, package files, active files, and managed append ownership must not
advertise two product-decision roles.

Related current-state documents: [workflow requirements](../02-requirements/workflows/design-plan-execute/README.md),
[roles and templates](../03-architecture/roles-and-templates.md), and
[trust boundaries](../04-security/trust-boundaries.md).
