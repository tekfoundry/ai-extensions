# Release Verification

## Release Gate Commands

The current release verification scripts are defined in `package.json`:

```bash
npm run build
npm run typecheck
npm test
npm run release:pack-preview
npm run release:local-smoke
npm run release:publish-dry-run
npm run release:verify
```

`npm run release:verify` composes build, typecheck, tests, pack preview, and
local install smoke. `release:publish-dry-run` is available as an additional
publish-readiness check.

## Build And Typecheck

- `npm run build` runs `tsc -p tsconfig.json` and emits compiled code.
- `npm run typecheck` runs `tsc -p tsconfig.json --noEmit`.
- `npm run verify` runs build, typecheck, and the full test suite.

Build and typecheck are required when TypeScript source, exported module shape,
command handlers, schema, or package scripts change.

## Package Smoke

`tests/package-smoke.test.mjs` runs `npm pack`, unpacks the archive into a
temporary directory, symlinks dependencies, and verifies:

- package name
- binary mapping
- publish access
- runtime dependencies
- compiled `dist/cli.js`
- bundled standalone skill files
- bundled workflow skill files
- bundled workflow template files
- bundled workflow role files
- help output from the packed binary

This test protects against shipping an archive that passes unit tests but omits
runtime assets.

## Local Install Smoke

`scripts/local-install-smoke.mjs` packs the project, unpacks it into a
temporary scoped package layout, symlinks dependencies, and runs:

```bash
aix --help
aix status
```

It uses a temporary npm cache and temporary install directory so it does not
alter the developer's global npm state.

## Pack Preview

`scripts/pack-preview.mjs` runs:

```bash
npm pack --dry-run --json
```

with a temporary npm cache. Use it to inspect package contents before release
without writing a publish artifact to the registry.

## Publish Dry Run

`scripts/publish-dry-run.mjs` runs:

```bash
npm publish --dry-run --json
```

and validates package identity, version, archive filename when provided, and
the presence of `bin/aix.js` in publish contents when npm reports file entries.

## Smoke Scripts For Bundled Assets

Additional smoke scripts exist for asset-focused validation:

```bash
npm run smoke:aix-dev-roles
npm run smoke:local-assets
```

Use them when bundled roles, workflow assets, or local AIX asset precedence
changes.

## Release Residual Risks

- Release verification does not prove real npm registry publication will
  succeed.
- Smoke tests use temporary local installs, not a global install on every
  supported developer machine.
- Remote Git behavior is still mostly represented through temporary local Git
  repositories in tests.
- Human review remains required for README examples, changelog/release notes,
  and package content reasonableness.
