# Operations knowledge

Owners: `technical-architect` and `quality-engineer`

This area describes how AI Extensions is built, packaged, released, checked,
and operated. The technical architect owns build and runtime topology. The
quality engineer owns smoke checks, release verification, monitoring
expectations, incident validation, and regression gates.

## Documents

- [Release and maintenance](release-and-maintenance.md): build, test, package,
  smoke, update, rollback, and maintenance expectations for AIX.
- [GitHub release process](github-release-process.md): current Release Please,
  GitHub Release artifact, npm publish, environment, and post-release
  validation process.

Use this area for:

- build and packaging workflow
- release mechanics and environment assumptions
- runtime topology and operational boundaries
- rollback model
- smoke checks and release verification
- monitoring expectations and incident validation
- operational runbooks

Keep execution notes in plans. Promote only durable operating knowledge here.

## Operational Surfaces

AIX has three operational surfaces:

- Maintainer repository operations: build, typecheck, tests, release scripts,
  GitHub Actions workflows, Release Please configuration, changelog ownership,
  npm package metadata, and local release artifacts.
- Published package operations: the scoped `@tekfoundry/aix` npm package, the
  short `aix` binary, compiled `dist/` output, and bundled `aix/` workflow,
  skill, role, and template assets.
- Project workspace operations: project-local `aix.json`, `aix.lock.json`,
  `.agents/` package-managed assets, `_docs/` project-owned knowledge, and
  verification commands such as `aix status` and `aix verify`.

Operational docs should distinguish those surfaces so release work does not
accidentally rewrite project-owned documentation, mutate a developer's global
state, or publish an unverified artifact.
