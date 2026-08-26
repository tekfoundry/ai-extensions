# Architecture knowledge

Owner: `technical-architect`

This area explains how the implemented system is structured. It should help a
developer understand the modules, runtime contracts, data flow, and lifecycle
states that matter before changing code.

## Documents

- [System architecture](system-architecture.md): runtime shape, module map,
  ownership boundaries, and invariants.
- [Package management](package-management.md): manifest, lockfile, source,
  package, activation, drift, and update model.
- [Workflow lifecycle](workflow-lifecycle.md): workflow install/update/remove,
  workflow-owned skills, roles, templates, and project docs scaffolding.

Use this area for:

- subsystem architecture and ownership boundaries
- runtime contracts and command-flow traces
- manifest, lockfile, package-store, workflow, role, skill, and template
  lifecycles
- data flow, state machines, and sequence diagrams
- module maps and extension points
- invariants, failure modes, and maintainability tradeoffs

Architecture docs should cite implementation facts when practical. If a plan
and implementation disagree, inspect the implementation before updating this
area.
