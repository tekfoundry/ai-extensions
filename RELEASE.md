# Release process

AI Extensions uses Release Please to prepare version and changelog changes for
`@tekfoundry/aix`.

## First MVP release

1. Confirm `package.json` still names `@tekfoundry/aix`, uses
   `publishConfig.access` set to `public`, and points at the TekFoundry GitHub
   repository.
2. Confirm the `tekfoundry` npm organization owns the package scope and that
   the publishing account or trusted publisher can publish public packages.
3. Configure the GitHub repository before the first publish:

   - Protect `master` or `main`.
   - Require the CI workflow to pass before merge.
   - Create a GitHub environment named `npm-publish`.
   - Add required reviewers to the `npm-publish` environment.
   - Configure npm trusted publishing for workflow file `publish.yml` and
     environment `npm-publish` after the npm package record exists.

4. Run the repository verification suite:

   ```bash
   npm run build
   npm run typecheck
   npm test
   npm run release:pack-preview
   npm run release:local-smoke
   git diff --check
   ```

   Run `npm run release:publish-dry-run` separately after npm account access is
   restored. Until then, npm may emit login-related dry-run warnings that are
   not useful in automatic CI.

### Temporary GitHub artifact install

Until npm publishing is available, attach a locally packed npm artifact to a
GitHub Release so users can install `aix` without cloning the repository:

```bash
npm run release:github-artifact
```

Create or update the matching GitHub Release, attach the generated
`release-artifacts/tekfoundry-aix-<version>.tgz` file, and paste the printed
checksum block into the release notes. The helper also writes a
`.tgz.sha256` sidecar file for local reference. The README temporary install
command depends on the exact release tag and artifact name.

5. Let Release Please create the release PR. For the first release, review the
   proposed `package.json`, `package-lock.json`, `CHANGELOG.md`, and
   `.release-please-manifest.json` changes before merging. The Release Please
   workflow is manual-only until branch protection, CI, and the first release
   path are ready.
6. Publish only from the selected tag after the publish workflow and npm
   trusted publishing setup are ready:

   - Open the `Publish npm package` workflow in GitHub Actions.
   - Run it manually with the selected release tag, such as `v0.1.0`.
   - Approve the `npm-publish` environment when GitHub asks for review.

7. After publish, verify a clean install in another project and run
   `aix --help` plus one read-only command.

## Ongoing releases

- Use Conventional Commit style PR titles or squash commit messages so Release
  Please can infer the version bump and changelog entry.
- After the first release path is proven, the Release Please workflow may move
  back to protected-branch pushes so ordinary merged work creates or updates a
  release PR.
- Publishing must not happen on every push. Merge the release PR and approve or
  manually dispatch the publish workflow for the selected tag or GitHub Release.
- Prefer npm trusted publishing over long-lived npm tokens.

## npm trusted publishing fallback

The preferred publish path is npm trusted publishing from GitHub Actions. If it
cannot be used for the first release, create a granular npm access token that
can publish only `@tekfoundry/aix`, store it as an environment secret on
`npm-publish`, and remove it after trusted publishing is working.

## Deferred release automation

These items are intentionally deferred until after the first public release
proves the package, npm ownership, and GitHub Actions path:

- Switch `publish.yml` from manual dispatch to a GitHub Release or tag trigger
  only after the manual release path has succeeded at least once.
- Add a post-publish verification workflow that installs `@tekfoundry/aix` from
  npm in a clean project and runs `aix --help` plus one read-only command.
- Consider adding package provenance or artifact attestation checks to CI if
  npm and GitHub expose a stable verification command for the trusted publisher
  path.
