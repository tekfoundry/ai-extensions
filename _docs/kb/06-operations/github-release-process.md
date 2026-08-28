# GitHub Release Process

## Current Release Model

AIX currently uses a reviewed, tag-triggered GitHub release process. Local npm
version scripts prepare the release commit and `v*` tag. GitHub Actions
publishes from that tag after release verification passes.

The release process has these durable parts:

- `npm run release:patch`, `npm run release:minor`, and
  `npm run release:major` provide the current local release path.
- `release-please-config.json` and `.release-please-manifest.json` remain in
  the repo for future release PR automation.
- `CHANGELOG.md` records released changes.
- `.github/workflows/release-please.yml` is manually dispatched and opens or
  updates a release PR when maintainers choose to use that path.
- `.github/workflows/publish.yml` runs for pushed `v*` tags and can also be
  manually dispatched with an explicit tag. It publishes only after
  `npm run release:verify` passes.
- `RELEASE.md` is the maintainer-facing runbook for release setup and ongoing
  releases.

## Release Please Workflow

The `Release Please` GitHub Actions workflow is available but is not the
current day-to-day release path. It is configured with
`workflow_dispatch`, not push automation. It runs
`googleapis/release-please-action@v4` with:

```yaml
config-file: release-please-config.json
manifest-file: .release-please-manifest.json
```

It requires write access to repository contents, issues, and pull requests so
it can prepare the release PR. Its concurrency group is scoped to
`release-please-${{ github.ref }}` and does not cancel in-progress runs.

Maintainers should review the release PR before merge, especially:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `.release-please-manifest.json`

The current configuration uses `include-v-in-tag: true` and
`include-component-in-tag: false`, so release tags are expected to look like
`v0.1.4`, not component-prefixed tags.

## Publish Workflow

Maintainers currently prepare local releases with one of:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

Each command runs `npm run release:verify`, bumps `package.json` and
`package-lock.json`, creates the matching `v*` Git tag, and prints:

```bash
git push origin master --follow-tags
```

The `Publish npm package` GitHub Actions workflow runs on pushed `v*` tags.
It can also be manually dispatched with a required `tag` input, for example
`v0.1.4`.

The workflow:

1. Checks out the selected tag.
2. Sets up Node.js 24 and the npm registry URL.
3. Runs `npm ci`.
4. Runs `npm run release:verify`.
5. Runs `npm publish`.

The workflow runs in the `npm-publish` GitHub environment and grants
`id-token: write` for npm trusted publishing. If trusted publishing is
unavailable during an incident, `RELEASE.md` documents the fallback: use a
granular npm access token stored as an environment secret on `npm-publish`,
then remove it after trusted publishing works again.

Publishing should remain tied to an explicit release point. A normal branch
push or ordinary CI run must not publish a package.

## CI Release Gate

The CI workflow runs on pull requests and pushes to `master` or `main`. It uses
Node.js 24 and runs:

```bash
npm ci
npm run build
npm run typecheck
npm test
npm run release:pack-preview
npm run release:local-smoke
git diff --check
```

The publish workflow repeats the release gate through `npm run release:verify`
from the selected tag so the published artifact is verified from the same
source state being released.

## Fallback GitHub Release Artifact

The normal distribution path is npm. If npm publishing is unavailable during
an incident, maintainers can create a GitHub Release install artifact with:

```bash
npm run release:github-artifact
```

The script:

1. Runs `npm run build`.
2. Runs `npm pack --pack-destination release-artifacts --json`.
3. Writes the `.tgz` package archive under `release-artifacts/`.
4. Computes a SHA-256 checksum.
5. Writes a `.tgz.sha256` sidecar file.
6. Prints a checksum block for release notes.

The generated `.tgz` should be attached to the matching GitHub Release with
the printed checksum. Treat this as a fallback distribution path, not the
normal release flow.

## Release Preconditions

Before publishing, maintainers must confirm:

- `package.json` still names `@tekfoundry/aix`.
- `publishConfig.access` remains `public`.
- the repository metadata points to the TekFoundry GitHub repository.
- the `tekfoundry` npm organization owns the package scope.
- the publishing account or trusted publisher can publish public packages.
- `master` or `main` is protected.
- CI is required before merge.
- the `npm-publish` GitHub environment exists.
- required reviewers are configured on `npm-publish`.
- npm trusted publishing is configured for `publish.yml` and the
  `npm-publish` environment.

## Ongoing Release Sequence

For normal releases:

1. Use Conventional Commit style PR titles or squash commit messages so
   Release Please can infer the version bump and changelog entry.
2. Run or rely on CI for build, typecheck, tests, pack preview, local install
   smoke, and whitespace checks.
3. Run `npm run release:patch`, `npm run release:minor`, or
   `npm run release:major`.
4. Review the generated version and changelog changes.
5. Push the release commit and `v*` tag with
   `git push origin master --follow-tags`.
6. Approve the `npm-publish` environment when GitHub requests review.
7. After publish, verify a clean install in another project and run
   `aix --help` plus one read-only command.

## Operational Failure Paths

- Release Please PR is wrong: close or update the release PR; do not publish
  from that proposed version until changelog and manifest changes are correct.
- CI fails: fix the failing source state before merging the release PR or
  dispatching publish.
- Publish workflow fails before `npm publish`: fix the workflow, package
  metadata, dependency install, or release verification failure; rerun against
  the same intended tag only after the cause is understood.
- Publish fails at npm authentication or authorization: confirm trusted
  publishing, `npm-publish` environment, npm organization membership, package
  ownership, and fallback token configuration.
- GitHub artifact checksum mismatch: regenerate the artifact from the intended
  release source state and replace both the `.tgz` and checksum note.
- Published npm version is wrong: npm versions are immutable, so recover with a
  new version and clear release notes rather than trying to overwrite the
  existing version.

## Deferred Automation

The current process intentionally defers:

- automatic publish from every push
- publish-on-GitHub-Release triggers
- post-publish clean npm install automation
- provenance or artifact attestation checks beyond the current trusted
  publishing shape

Those changes should be handled by a future plan because they alter release
trust, automation timing, and operational risk.
