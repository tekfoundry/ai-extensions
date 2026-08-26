# Source Resolution And Cache Architecture

## Source Definition Model

AIX source definitions are currently Git-backed:

```ts
{
  type: "git",
  url: string,
  path?: string,
  ref?: string
}
```

The same source definition shape is used for skill sources, workflow sources,
and role sources. Different source groups are stored separately in `aix.json`
and loaded through different default-source functions.

## Default Sources

The default source named `aix` points to the AI Extensions repository. It has
different default paths depending on package kind:

- skills: `aix/skills`
- workflows: `aix/workflows/design-plan-execute`
- roles: `aix/roles`

The implementation also includes default external skill sources. Environment
variables can override default source URLs, paths, and refs for tests or local
development.

## Manifest Source Loading

Source loading follows a defaults-plus-manifest pattern:

```text
loadSourceDefinitions()
  -> default skill sources
  -> manifest skill sources override matching names

loadWorkflowSourceDefinitions()
  -> default workflow sources
  -> manifest workflow sources override matching names

loadRoleSourceDefinitions()
  -> default role sources
  -> manifest role sources override matching names
```

`aix.json` supports current nested source groups and a legacy flat skill source
shape. New writes use nested source groups.

## Git Resolution

Git source resolution uses a deterministic cache root:

```text
AIX_CACHE_DIR or <os tmpdir>/aix-cache
```

Resolution flow:

```text
resolve source
  -> create cache root
  -> clone --no-checkout when cache missing
  -> update origin URL when source URL changed
  -> fetch --prune origin
  -> resolve requested ref or HEAD to commit
  -> checkout --force --detach <commit>
  -> return rootPath = cache/<source>/<definition.path>
```

The resolved commit is recorded in the lockfile for Git-backed package entries.
The package copy under `.agents/packages/` is what AIX later diffs and verifies
against, not the mutable Git cache.

## GitHub Tree URL Normalization

Source input can be a full Git URL or a GitHub tree URL. GitHub tree URLs are
normalized into Git URL, ref, and source path. When AIX writes a source back to
the manifest and the source can be represented as a GitHub tree URL, it uses
that compact string form.

## Local Bundled Source Precedence

Supported local bundled paths take precedence over remote default `aix`
sources when the matching local path exists:

- `aix/workflows/<workflow>` for workflow install/update
- `aix/skills/...` for bundled skill activation/update
- `aix/roles/...` for bundled role activation/update

Local package entries are recorded with `sourceType: "local"` and no resolved
commit. Diff and update compare against the local source path directly.

This local precedence lets contributors test bundled assets from the source
tree without fetching the published repository snapshot.

## Source Metadata

Adding a skill or role source resolves the source and writes cache metadata for
discovered package candidates. Listing commands read that metadata so listing a
source does not need to re-resolve the repository every time.

Source removal deletes manifest source entries and cached metadata only when no
manifest or lockfile entries still depend on the source.

## Failure Modes

- Unknown source name: resolution stops before package writes.
- Missing Git ref: resolution fails with a source/ref error.
- Cache repository without `origin`: cache is recloned.
- Changed source URL: cache origin is updated before fetch.
- Missing local source path for a local lockfile entry: diff/update stops.
- Source removal with active dependents: removal is blocked until active assets
  are deactivated or workflow lifecycle removes them.
