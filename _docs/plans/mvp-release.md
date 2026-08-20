# MVP Release Plan

## Status

🟨 Active

This plan was activated by user request on 2026-08-19. It is now the active
implementation record for the MVP release.

## Context

AI Extensions is a small package-manager-style CLI for managing AI-agent
extensions inside software projects. The MVP starts with skills. The accepted
design lives in `_docs/design/` and defines the MVP around:

- a TypeScript and Node.js CLI distributed as a scoped npm package that exposes
  the short `aix` binary
- commands for `install`, `update`, `diff`, `verify`, and `list <source>`
- initialization through `aix init`
- Git-based skill sources only
- project manifests in `aix.json`
- exact install state in `aix.lock.json`
- installs into `.agents/skills/<installed-name>`
- clear collision handling and explicit aliases
- lockfile hashes and local drift protection before overwrites
- default source discovery for `aix`, `mattpocock`, and `cursor-pstack`
- workflow skills from the remote `aix` Git source at path `aix/skills`
- repeatable versioning and npm publishing so other projects can install it

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `.agents/README.md`
- `_docs/design/README.md`
- `_docs/design/overview.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
- `_docs/design/bundled-skills.md`
- `README.md`

`_docs/README.md` does not exist yet. For now, `_docs/design/README.md` is the
project documentation router.

## High-Level Goal (status: accepted)

Ship the first usable AI Extensions MVP as a versioned npm package. The
package exposes an `aix` CLI that discovers, installs, updates, diffs, and
verifies AI-agent skills from Git-based sources. It protects local edits and
records exact resolved state.

The release should let a project manage skills the way it manages other local
dependencies. A project declares the skills it wants, installs them into
`.agents/skills`, reviews changes before accepting updates, and can trust that
AI Extensions will not overwrite modified local files without warning.

The MVP is not complete until the team can publish a new package version
through a documented repeatable path.

## Design Intent (status: accepted)

Build the MVP as a TypeScript CLI on Node.js. Keep the modules small and
explicit while the product rules are still settling.

The CLI should expose these commands:

- `aix init`
- `aix install`
- `aix install <source>/<path>`
- `aix update`
- `aix update <source>/<path>`
- `aix diff`
- `aix diff <source>/<path>`
- `aix verify`
- `aix list <source>`

`aix list <source>` discovers skills from a configured source. It does not
write to the manifest, lockfile, or `.agents/skills`.

`aix init` initializes the local AI Extensions environment. It creates
`.agents/`, `.agents/skills/`, `aix.json`, and `aix.lock.json`; writes Git
source definitions for `aix`, `mattpocock`, and `cursor-pstack`; installs the
default skills from the remote `aix` source path `aix/skills`; and installs
`cursor-pstack/unslop` from the `cursor-pstack` source.

`aix.json` should declare common skill dependencies as compact `source:path`
strings. Object entries are reserved for aliases, per-skill refs, or later
metadata.

`aix install` reads `aix.json`, resolves Git sources, validates requested
skills, detects naming collisions, checks local drift against the lockfile,
copies files into `.agents/skills`, rewrites `SKILL.md` front matter when an
alias is used, hashes installed files, and writes `aix.lock.json`
atomically.

Targeted install arguments such as `aix install cursor-pstack/tdd` should work
when the source is known through built-in defaults or manifest configuration.
If the requested skill is not already declared, the command may update
`aix.json` only after this plan says so directly. Until then, the safer
MVP behavior is to install declared skills only and treat targeted arguments as
filters.

`aix update` intentionally refreshes locked Git commits and installed file
hashes. It must run the same local drift checks before changing files.

`aix diff` shows the difference between the installed locked copy and the
currently resolved source version. It does not change project files.

`aix verify` checks that the manifest, lockfile, installed files, hashes, skill
front matter, and naming rules still agree.

File operations are safety-sensitive. All writes stay scoped to
`aix.json`, `aix.lock.json`, and `.agents/skills` unless a command
explicitly initializes missing documentation folders. The MVP does not add
registry support, plugin package support, dependency resolution, global
installs, or compatibility symlink management.

Release operations are safety-sensitive too. The MVP includes automated
versioning and publishing for the scoped npm package. The workflow must keep
npm credentials out of the repository, require verification before publish, and
name the publish target plainly. Publishing should run from CI once credentials
are configured. The plan should also keep a documented manual fallback for the
first release or an emergency release.

## Non-Goals

- No registry-backed skill source support.
- No plugin package installation.
- No dependency graph or transitive skill dependency resolution.
- No global skill installs.
- No automatic merges for locally edited installed skills.
- No routine updates to project-owned `_docs/` after initial folder creation.
- No package publishing to an unscoped `aix` npm package.
- No automatic release from unreviewed local changes.

## Boundaries And Invariants

- `.agents/` is package-managed agent process structure.
- `aix/skills/` is the canonical workflow skill source path inside the remote
  `aix` Git source.
- `_docs/` is project-owned documentation.
- Installed skills live under `.agents/skills/<installed-name>`.
- A skill folder is valid only when it contains a valid `SKILL.md`.
- Natural skill names are used unless the manifest declares an alias.
- Install-name collisions fail before copying files.
- A local file that differs from the lockfile hash is treated as local drift.
- Install and update must refuse to overwrite local drift.
- The lockfile records resolved Git commit SHAs and installed file hashes.
- Lockfile writes are atomic.
- Discovery commands do not mutate project files.
- Published package versions are immutable once released.
- Version changes, changelog entries, build output, and publish artifacts must
  come from the same reviewed source revision.
- Publishing requires passing verification and an explicit release trigger.

## Implementation Phases

### Phase 1: CLI foundation and project schema (status: completed)

Goal: create the TypeScript package structure and the smallest useful command
runner for later phases.

Tasks:

- ✅ Scaffold the Node.js and TypeScript package with an `aix` binary entry.
- ✅ Add build, typecheck, and test scripts.
- ✅ Define manifest and lockfile TypeScript types.
- ✅ Implement manifest loading and validation for `aix.json`.
- ✅ Implement lockfile loading, validation, and atomic writing for
      `aix.lock.json`.
- ✅ Add structured CLI errors with non-zero exit codes.
- ✅ Add tests for schema validation, missing files, malformed JSON, and
      atomic lockfile writes.
- ✅ Create a build command that allows `aix` commands to work.

Verification:

- `npm run typecheck`
- `npm test`
- local CLI smoke check for help output and unknown command errors

Completion evidence:

- 2026-08-19: `npm run typecheck` passed using Node 24 npm directly.
- 2026-08-19: `npm run build` passed using Node 24 npm directly.
- 2026-08-19: `npm test` passed with 10 node:test tests.
- 2026-08-19: `node bin/aix.js --help` printed help and exited 0.
- 2026-08-19: `node bin/aix.js nope` printed an unknown-command error and
  exited 1.
- 2026-08-19: `npm run aix -- --help` built the project and printed help.
- 2026-08-19: `npm run aix --` built the project and printed the AI Extensions
  splash screen with version and command list.

### Phase 2: Init, Git sources, and skill discovery (status: completed)

Goal: initialize the local AI Extensions environment, resolve configured Git
sources, and list valid skills without changing installed skills during
discovery.

Tasks:

- ✅ Implement `aix init` to create `.agents/`, `.agents/skills`, `aix.json`,
      and `aix.lock.json`; write default source definitions for `aix`,
      `mattpocock`, and `cursor-pstack`; install all default skills from the
      `aix` Git source path `aix/skills`; and install `cursor-pstack/unslop`.
- ✅ Define built-in default sources for `aix`, `mattpocock`, and
      `cursor-pstack`.
      The built-in `aix` source should resolve to
      `https://github.com/tekfoundry/ai-extension.git` path `aix/skills` at ref
      `master`.
- ✅ Implement Git clone or fetch into a deterministic cache location.
- ✅ Resolve requested refs to exact commit SHAs.
- ✅ Implement flat and nested skill discovery by finding folders containing
      `SKILL.md`.
- ✅ Validate `SKILL.md` front matter enough to require a usable `name`.
- ✅ Implement `aix list <source>`.
- ✅ Prove `aix list` does not change `aix.json`, `aix.lock.json`, or
      `.agents/skills`.

Verification:

- command-level tests for `aix init` on an empty project and an already
  initialized project
- tests proving `aix init` does not overwrite local edits in `.agents/skills`,
  `aix.json`, or `aix.lock.json`
- unit tests with local fixture Git repositories
- opt-in integration tests against public remote Git sources are allowed, but
  should stay outside the default suite so routine verification remains
  deterministic
- command-level tests for `aix list aix`, flat discovery, nested discovery, and
  unknown sources
- mutation check around `aix list`

Completion evidence:

- 2026-08-19: `npm test` passed with command-level `aix init` coverage.
- 2026-08-19: local fixture Git tests confirmed `aix init` writes `aix.json`
  and `aix.lock.json`, declares `aix`, `mattpocock`, and `cursor-pstack`
  sources, installs 12 skills from the `aix` Git source path `aix/skills`, and
  installs `cursor-pstack/unslop` from the `cursor-pstack` Git source.
- 2026-08-19: `npm test` passed with local fixture Git coverage for clone,
  fetch/cache reuse, and exact commit resolution.
- 2026-08-19: `npm test` passed with flat and nested skill discovery,
  front-matter `name` validation, `aix list aix`, fixture Git source listing,
  unknown source failures, and mutation checks proving `aix list` does not
  write `aix.json`, `aix.lock.json`, or `.agents/skills`.
- 2026-08-19: Manifest parsing and `aix init` output were updated so normal
  skill declarations use compact `source:path` strings, with object entries
  still accepted when metadata such as aliases is needed.

### Phase 3: Install behavior and lockfile integrity (status: accepted)

Goal: install declared skills into `.agents/skills` and record exact lockfile
state.

Tasks:

- ⬜️ Implement install selection from declared manifest entries.
- ⬜️ Locate requested source-relative skill paths.
- ⬜️ Determine installed names from natural names or aliases.
- ⬜️ Validate aliases as safe folder names.
- ⬜️ Detect install-name collisions before copying.
- ⬜️ Copy skill files deterministically into `.agents/skills`.
- ⬜️ Rewrite `SKILL.md` front matter `name:` when an alias is used.
- ⬜️ Hash installed files with SHA-256.
- ⬜️ Write lockfile entries with source URL, requested ref, resolved commit,
      source path, install path, original name, installed name, alias metadata,
      and file hashes.
- ⬜️ Preserve package-managed and project-owned boundaries during install.

Verification:

- unit tests for name resolution, alias validation, collision detection,
  copying, front matter rewrite, hashing, and lockfile content
- command-level install tests using local fixture Git repositories
- `npm run typecheck`
- `npm test`

### Phase 4: Drift protection, update, diff, and verify (status: accepted)

Goal: make repeated use safe. AI Extensions should detect local edits, show
pending changes, and check installed state.

Tasks:

- ⬜️ Implement lockfile hash comparison against installed files.
- ⬜️ Fail install and update when local drift is detected.
- ⬜️ Implement `aix update` for all locked skills.
- ⬜️ Implement targeted update filtering if the command shape is accepted.
- ⬜️ Implement `aix diff` against the currently resolved source version.
- ⬜️ Implement targeted diff filtering if the command shape is accepted.
- ⬜️ Implement `aix verify` for manifest, lockfile, installed files, hashes,
      skill front matter, aliases, and collision rules.
- ⬜️ Add actionable error messages for drift, missing installed files,
      lockfile mismatch, unresolved sources, and invalid skills.

Verification:

- unit tests for drift detection and verification failures
- command-level tests for update, diff, verify, and targeted filters
- tests proving locally edited files are not overwritten
- `npm run typecheck`
- `npm test`

### Phase 5: Package readiness (status: accepted)

Goal: make the package understandable, buildable, and locally packable.

Tasks:

- ⬜️ Add package metadata for scoped npm distribution with the `aix` binary.
- ⬜️ Add README usage examples that match implemented behavior.
- ⬜️ Document manifest and lockfile examples.
- ⬜️ Document the default sources and the Git-only MVP boundary.
- ⬜️ Add a local package smoke test using `npm pack` or equivalent.
- ⬜️ Run full verification.

Verification:

- `npm run build`
- `npm run typecheck`
- `npm test`
- local packed CLI smoke test

### Phase 6: Repeatable versioning and publishing (status: accepted)

Goal: publish AI Extensions as a versioned package and make future releases
repeatable.

Tasks:

- ⬜️ Choose the MVP release workflow, such as Changesets, semantic-release, or
      a small documented `npm version` flow.
- ⬜️ Add a versioning command or release checklist that updates `package.json`
      and the changelog in a predictable way.
- ⬜️ Add CI verification for build, typecheck, tests, package contents, and
      CLI smoke checks.
- ⬜️ Add an npm publish workflow for `@tekfoundry/aix` with provenance when
      supported.
- ⬜️ Document required npm token setup without committing credentials.
- ⬜️ Require an explicit release trigger, such as a GitHub release, tag, or
      manually approved workflow dispatch.
- ⬜️ Prove the workflow can run a publish dry run or complete every step up to
      the final npm publish gate.
- ⬜️ Publish the first MVP version once credentials and package ownership are
      confirmed.
- ⬜️ Verify the package can be installed by another project and that the
      installed `aix` binary runs.
- ⬜️ Record any deferred behavior that should become a later plan.

Verification:

- CI build, typecheck, and test workflow passes
- release dry run or equivalent publish preview passes
- package contents check confirms only intended files are included
- `npm install -g @tekfoundry/aix` or an equivalent clean-environment install
  succeeds after publish
- installed `aix --help` and at least one read-only command run successfully

## Open Questions / Decisions

- Manifest shape: define the exact JSON schema before Phase 1 implementation.
- Targeted install behavior: decide before Phase 3 whether
  `aix install <source>/<path>` can add to `aix.json`, or whether it only
  filters already declared manifest entries in the MVP.
- Git cache location: decide before Phase 2 whether the cache lives under a
  project-local path, an OS cache directory, or a temporary test-controlled
  location.
- Built-in `aix` source packaging: keep `aix/skills` as the source path inside
  `https://github.com/tekfoundry/ai-extension.git` at ref `master`.
- Diff format: decide before Phase 4 whether MVP output is unified diff text,
  a structured summary, or both.
- Initialization behavior: decide before Phase 5 whether `aix install` may
  scaffold missing `.agents` and `_docs` folders, or whether that belongs to a
  later explicit command.
- Release workflow: choose before Phase 6 whether to use Changesets,
  semantic-release, or a simpler npm-version workflow.
- Publish trigger: choose before Phase 6 whether releases are triggered by
  tags, GitHub releases, or a manually approved workflow.
- First release scope: confirm before Phase 6 that `@tekfoundry/aix` is the npm
  package target and that the package owner has permission to publish it.

## Risks

- Drift protection can create false confidence if hashes omit files, normalize
  paths inconsistently, or ignore deleted files.
- Git cache behavior can become a source of stale reads if ref resolution and
  fetch rules are unclear.
- Alias front matter rewrites can corrupt `SKILL.md` if the front matter parser
  is too loose.
- Atomic lockfile writes need careful temp-file placement so cross-device
  renames do not fail.
- Targeted install behavior can surprise users if the command silently edits the
  manifest. Decide this before implementation.
- Default external sources require network access in normal use. Tests should
  rely on local fixture repositories so verification stays deterministic.
- Publishing can leak credentials or publish the wrong package if CI secrets,
  package name, or access settings are wrong.
- Automated versioning can produce confusing releases if changelog entries and
  version bumps are not tied to reviewed changes.
- npm package contents can accidentally include local-only files if the package
  files allowlist is too broad.

## Lessons To Carry Forward

- Treat lockfile writes and installed skill overwrites as safety-sensitive.
- Keep default skills project-agnostic.
- Keep source discovery read-only.
- Keep the MVP small enough that users can trust the tool before adding richer
  source types or automation.
- Treat repeatable publishing as part of the MVP, not cleanup after the MVP.
- Use the workflow task status markers in plan task lists from the start:
  `⬜️`, `🟨`, `✅`, and `⚠️`.

## Promotion To Design

After this plan is done, promote durable decisions into `_docs/design/`,
especially:

- the exact manifest schema
- the exact lockfile schema
- targeted command semantics
- Git cache rules
- built-in `aix` source packaging behavior
- CLI output and exit-code conventions
- release workflow, versioning rules, publish trigger, and npm package access
  requirements
