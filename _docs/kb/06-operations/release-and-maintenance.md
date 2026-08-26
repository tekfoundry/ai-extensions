# Release And Maintenance

## Build And Package

AIX builds TypeScript into `dist/`:

```bash
npm run build
```

The npm package exposes the short `aix` binary through `bin/aix.js` and is
published as `@tekfoundry/aix`.

## Release Checks

Use targeted checks for the touched subsystem first. Before release-oriented
closeout, run:

```bash
npm run build
npm test
node dist/cli.js verify
```

Package-sensitive changes should also keep the package smoke test passing so
the packed artifact contains a working binary and expected workflow assets.

## Maintenance Operations

- Use `aix status` to inspect local workspace state.
- Use `aix verify` to detect manifest, lockfile, package, active-file,
  workflow-doc, managed `AGENTS.md`, template, skill, and role drift.
- Use `aix workflow diff` before updating package-managed workflow content.
- Use `aix workflow update` only after reviewing the diff and ensuring local
  drift does not need preservation.
- Use `aix templates publish`, `aix templates diff`, and `aix templates reset`
  to manage project-owned template overrides.

## Rollback Model

The practical rollback for package-managed workflow or skill changes is to
restore the previous source state and rerun the relevant update command after
drift checks pass. Because lockfile writes are atomic, an interrupted write
should not leave a partially written lockfile.

For project-owned documentation, rollback is normal version-control review.
Workflow update should not rewrite project-owned `_docs` content.

## Incident And Recovery Notes

If an interrupted workflow execution leaves half-finished files:

1. Inspect `git status --short`.
2. Compare workflow source with installed `.agents/packages` copies.
3. Verify lockfile shape and counts.
4. Run targeted tests for the interrupted subsystem.
5. Record validation gaps in the active plan before continuing to later
   phases.
