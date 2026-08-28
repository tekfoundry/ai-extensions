# Release And Maintenance

## Build And Package

AIX builds TypeScript into `dist/`:

```bash
npm run build
```

The npm package exposes the short `aix` binary through `bin/aix.js` and is
published as `@tekfoundry/aix`. `package.json` includes only these package
payload roots:

- `aix/`
- `bin/`
- `dist/`
- `README.md`

That package shape means operational release checks must verify compiled
runtime code, the executable binary mapping, and bundled workflow, skill, role,
guidance, and template assets.

## Runtime Topology

AIX is a local Node.js CLI. It does not run a server, daemon, database,
background worker, or hosted runtime.

The executable entrypoint is `bin/aix.js`, which imports `dist/cli.js`.
Operationally, this means:

- source changes in `src/` are not runnable from the published package until
  `npm run build` regenerates `dist/`.
- package smoke checks must run against a packed artifact, not only against the
  source tree.
- a published package failure usually presents as a binary startup failure,
  missing bundled asset, command parse error, local filesystem refusal, or
  Git/source-resolution failure in the consuming project.

## Environment Assumptions

- Node.js support starts at `>=20.17` according to `package.json`.
- CI currently runs on GitHub-hosted Ubuntu with Node.js 24.
- Release and smoke scripts use temporary npm caches and temporary directories
  so they do not write to the developer's global npm cache or global package
  installation.
- Git-backed sources are the current source-resolution model. Registry,
  plugin-package, global-install, or marketplace behavior is not part of the
  current operational surface unless a future accepted plan adds it.

## Release Checks

Use targeted checks for the touched subsystem first. Before release-oriented
closeout, run:

```bash
npm run build
npm run typecheck
npm test
npm run release:pack-preview
npm run release:local-smoke
git diff --check
```

`npm run release:verify` composes build, typecheck, tests, pack preview, and
local install smoke. `npm run release:publish-dry-run` is a separate
publish-readiness check because npm dry-run JSON and login warnings can vary
before npm account setup is complete.

See [Release verification](../05-quality/release-verification.md) for the
quality-owned details of what each check proves.

## GitHub Release Process

The current GitHub release process is documented in
[GitHub release process](github-release-process.md). In short:

- Release Please is manually dispatched to prepare a release PR.
- CI verifies build, typecheck, tests, package preview, local install smoke,
  and whitespace.
- local release commands `npm run release:patch`, `npm run release:minor`, and
  `npm run release:major` run release verification, bump the package version,
  create the matching Git tag, and print the push command.
- npm publishing runs from an explicit Git tag, either through a pushed `v*`
  tag or manual workflow dispatch for the selected tag.
- the publish workflow runs inside the `npm-publish` GitHub environment.
- the publish workflow runs `npm run release:verify` before `npm publish`.
- fallback GitHub Release artifacts can be generated with
  `npm run release:github-artifact` during npm publishing incidents.

Publishing must stay separated from ordinary push CI.

## Maintenance Operations

- Use `aix status` to inspect local workspace state.
- Use `aix verify` to detect manifest, lockfile, package, active-file,
  workflow-doc, managed `AGENTS.md`, template, skill, and role drift.
- Use `aix workflow diff` before updating package-managed workflow content.
- Use `aix workflow update` only after reviewing the diff and ensuring local
  drift does not need preservation.
- Use `aix templates publish`, `aix templates diff`, and `aix templates reset`
  to manage project-owned template overrides.
- Use `aix guidance list`, `aix guidance publish`, `aix guidance diff`, and
  `aix guidance reset` to manage active workflow and role guidance.
- Use role, skill, workflow, source, and template diff commands before updating
  package-managed assets in a project that may contain local edits.
- Treat lockfile writes, active-file updates, workflow install/update/remove,
  skill activation/deactivation, role activation/deactivation, template reset,
  and guidance reset as operationally safety-sensitive.

## Operational Monitoring

AIX currently has no production telemetry or hosted monitoring surface.
Operational health is assessed through:

- CI workflow results.
- release verification output.
- package smoke and local install smoke output.
- `aix status` and `aix verify` in affected workspaces.
- GitHub Issues for user-reported install, release, command, source-resolution,
  guidance, or local-file safety problems.
- manual README, changelog, and release note review before publishing.

When an incident is reported, start with the exact package version, install
method, command, workspace `aix.json`, workspace `aix.lock.json`, and whether
the failing asset is package-managed or project-owned.

## Rollback Model

The practical rollback for package-managed workflow or skill changes is to
restore the previous source state and rerun the relevant update command after
drift checks pass. Because lockfile writes are atomic, an interrupted write
should not leave a partially written lockfile.

For project-owned documentation, rollback is normal version-control review.
Workflow update should not rewrite project-owned `_docs` content.

Published npm versions are immutable. If a broken version is published, recover
by publishing a corrected later version, updating release notes, and directing
users to upgrade. Do not plan around overwriting the existing npm version.

GitHub Release artifacts can be replaced on the release page, but the
operationally safer path is to regenerate the artifact from the intended tag,
replace the asset and checksum together, and record what changed in the release
notes.

## Incident And Recovery Notes

If an interrupted workflow execution leaves half-finished files:

1. Inspect `git status --short`.
2. Compare workflow source with installed `.agents/packages` copies.
3. Verify lockfile shape and counts.
4. Run targeted tests for the interrupted subsystem.
5. Record validation gaps in the active plan before continuing to later
   phases.

If a release or publish operation fails:

1. Confirm the exact tag or commit used by the workflow.
2. Read the GitHub Actions log and identify whether the failure happened during
   dependency install, build, typecheck, tests, pack preview, local install
   smoke, publish authentication, or npm publication.
3. Reproduce the failing local command when possible using an isolated npm
   cache.
4. If the failure is authentication or authorization, inspect the `npm-publish`
   GitHub environment, trusted publishing configuration, npm organization
   membership, and package ownership before changing package code.
5. Do not rerun publish against a different tag without an explicit release
   decision.

## Documentation Impact

Operational changes should update this area when they alter:

- package scripts or release commands
- GitHub Actions workflow triggers, permissions, environments, or gates
- supported Node.js version
- package file payload
- release artifact naming or checksum behavior
- npm publishing, trusted publishing, or token fallback behavior
- rollback, recovery, monitoring, or incident validation expectations
