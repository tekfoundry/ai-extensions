# Release process

AI Extensions currently releases `@tekfoundry/aix` with local npm version
scripts and a tag-triggered GitHub Actions publish workflow. Release Please
configuration remains in the repo for future release PR automation, but the
day-to-day path is `npm run release:<type>` followed by pushing the release
commit and tag.

## Release flow

1. Confirm `package.json` still names `@tekfoundry/aix`, uses
   `publishConfig.access` set to `public`, and points at the TekFoundry GitHub
   repository.
2. Confirm the `tekfoundry` npm organization owns the package scope and that
   the publishing account or trusted publisher can publish public packages.
3. Confirm the GitHub repository release settings:

   - Protect `master` or `main`.
   - Require the CI workflow to pass before merge.
   - Create a GitHub environment named `npm-publish`.
   - Add required reviewers to the `npm-publish` environment.
   - Configure npm trusted publishing for workflow file `publish.yml` and
     environment `npm-publish`.

4. Run the repository verification suite:

   ```bash
   npm run build
   npm run typecheck
   npm test
   npm run release:pack-preview
   npm run release:local-smoke
   git diff --check
   ```

   Run `npm run release:publish-dry-run` separately when checking publish
   readiness. npm dry-run output can vary, so this check remains outside
   automatic CI.

5. Create the release commit and tag:

   ```bash
   npm run release:patch
   npm run release:minor
   npm run release:major
   ```

   Pick exactly one version type. Each command runs `npm run release:verify`,
   updates the npm package version, creates the matching Git tag, and prints
   the push command.

6. Push the release commit and tag:

   ```bash
   git push origin master --follow-tags
   ```

   The pushed `v*` tag triggers `.github/workflows/publish.yml`. The publish
   workflow checks out the tag, runs `npm run release:verify`, publishes to
   npm with trusted publishing, and creates the GitHub Release if needed.

7. Approve the `npm-publish` environment when GitHub requests review.
8. After publish, verify a clean install in another project and run
   `aix --help` plus one read-only command.

## Ongoing releases

- Use Conventional Commit style PR titles or squash commit messages so Release
  Please can infer the version bump and changelog entry.
- Use `npm run release:patch`, `npm run release:minor`, or
  `npm run release:major` for the local release path until Release Please is
  wired back into the day-to-day process.
- Publishing must not happen on every branch push. Publish only from the
  selected `v*` tag or a manually dispatched workflow for that tag.
- Prefer npm trusted publishing over long-lived npm tokens.

## npm trusted publishing fallback

The preferred publish path is npm trusted publishing from GitHub Actions. If it
cannot be used during an incident, create a granular npm access token that can
publish only `@tekfoundry/aix`, store it as an environment secret on
`npm-publish`, and remove it after trusted publishing is working again.

## Fallback GitHub artifact

The normal install path is npm. If npm publishing is unavailable during an
incident, maintainers can generate a GitHub Release artifact:

```bash
npm run release:github-artifact
```

Attach the generated `release-artifacts/tekfoundry-aix-<version>.tgz` file to
the matching GitHub Release and include the printed checksum in the release
notes. Treat this as an emergency distribution path, not the normal release
flow.

## Deferred release automation

These items are intentionally deferred:

- Switch `publish.yml` to a GitHub Release trigger if release-page creation
  becomes the preferred publish gate.
- Add a post-publish verification workflow that installs `@tekfoundry/aix` from
  npm in a clean project and runs `aix --help` plus one read-only command.
- Consider adding package provenance or artifact attestation checks to CI if
  npm and GitHub expose a stable verification command for the trusted publisher
  path.
