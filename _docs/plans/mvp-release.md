# MVP Release Plan

## Status

🟨 Active

This plan was activated by user request on 2026-08-19. It is now the active
implementation record for the MVP release.

## Context

AI Extensions is a small package-manager-style CLI for managing AI assets
inside software projects. The MVP starts with skills and one installable agent
workflow. The accepted design lives in `_docs/design/` and defines the MVP
around:

- a TypeScript and Node.js CLI distributed as a scoped npm package that exposes
  the short `aix` binary
- commands for `install workflow`, `remove workflow`, `add skills`,
  `remove skills`, `activate skill`, `deactivate skill`, `update`, `diff`,
  `verify`, and `list skills [source]`
- initialization through `aix init`
- Git-based skill sources only
- project manifests in `aix.json`
- exact fetched and active state in `aix.lock.json`
- source metadata fetched into the shared Git cache
- active skill packages materialized under `.agents/packages/skills/<source>/...`
- active skills exposed through `.agents/skills/<active-name>`
- one active workflow installed under `.agents/` with workflow-owned skills
  materialized under `.agents/packages/workflows/...`
- clear collision handling and explicit aliases
- lockfile hashes and local drift protection before overwrites
- default source discovery for `aix`, `mattpocock`, and `cursor-pstack`
- the default `aix` workflow source at `aix/workflows/design-plan-execute`
- repeatable versioning and npm publishing so other projects can install it

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `.agents/README.md`
- `_docs/design/README.md`
- `_docs/design/overview.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
- `_docs/design/workflows.md`
- `_docs/design/bundled-skills.md`
- `README.md`

`_docs/README.md` does not exist yet. For now, `_docs/design/README.md` is the
project documentation router.

## High-Level Goal (status: accepted)

Ship the first usable AI Extensions MVP as a versioned npm package. The
package exposes an `aix` CLI that installs one agent workflow, adds and removes
skill sources, activates and deactivates skills, updates, diffs, and verifies
Git-based AI assets. It protects local edits and records exact resolved state.

The release should let a project manage AI skills and an agent workflow the way
it manages other local dependencies. A project declares sources, installs one
workflow, fetches source metadata into the shared Git cache, materializes active
skill and workflow package copies, exposes selected skills through
`.agents/skills`, reviews changes before accepting updates, and can trust that
AI Extensions will not overwrite modified local files without warning.

The MVP is not complete until the team can publish a new package version
through a documented repeatable path.

## Design Intent (status: accepted)

Build the MVP as a TypeScript CLI on Node.js. Keep the modules small and
explicit while the product rules are still settling.

The CLI should expose these commands:

- `aix init`
- `aix install workflow <git-or-github-tree-url> [alias]`
- `aix remove workflow`
- `aix add skills <git-or-github-tree-url> [alias]`
- `aix remove skills <source-name>`
- `aix activate skill [source/path] [alias]`
- `aix deactivate skill <active-name>`
- `aix update`
- `aix update <source>/<path>`
- `aix update workflow`
- `aix diff`
- `aix diff <source>/<path>`
- `aix diff workflow`
- `aix verify`
- `aix list`
- `aix list skills [source]`

Terminal UX should stay consistent across commands. Command modules should use
shared terminal UI helpers for selection menus, tables, color, and later status
messages instead of formatting each interaction by hand. The MVP should prefer
lightweight prompt and color dependencies over a full terminal app framework;
Ink can be revisited if later workflows need persistent interactive screens.

`aix list` opens an interactive kind picker with `skills` and `q - Quit`.
`aix list skills` opens an interactive source picker. `aix list skills
<source>` discovers skills from a configured source without prompting. None of
these forms write to the manifest, lockfile, `.agents/packages`, or
`.agents/skills`.

`aix install workflow <git-or-github-tree-url> [alias]` installs one
Git-backed workflow as the project's active AI Agent Workflow. Workflow install
normalizes GitHub tree URLs, fetches the source into the shared Git cache,
discovers the workflow by directory convention, copies recognized workflow docs
into `.agents/`, activates workflow-local skills, scaffolds missing `_docs`
directories, and writes workflow plus workflow-owned skill hashes to
`aix.lock.json`.

The MVP should allow only one active workflow at a time. Installing another
workflow should fail until a later explicit replacement flow is designed.
Workflow-local skills are owned by the workflow and should not be removable
through ordinary skill deactivation. Local edits to workflow docs or
workflow-owned skills are drift; verify should report them, and workflow update
or removal should refuse to overwrite or delete them.

`aix remove workflow` removes the active workflow docs and workflow-owned skills
only after local drift checks pass. It leaves project-owned `_docs` content in
place.

`aix diff workflow` compares locked workflow docs and workflow-owned skills
with the currently resolved workflow source without changing files.

`aix update workflow` refreshes locked workflow docs and workflow-owned skills
only after local drift checks pass.

`aix add skills <git-or-github-tree-url> [alias]` adds a Git-backed skill source
to `aix.json` under `sources.skills`, normalizes GitHub tree URLs into Git URL,
ref, and source path, discovers valid skill folders, and prefetches the source
into the shared Git cache. Source addition is the network-fetch and indexing
step; it does not copy every discovered skill into `.agents/packages` by
default. The plural `skills` names the source collection kind and leaves room
for later commands such as `aix add agents <url>` or
`aix add automations <url>`.

`aix remove skills <source-name>` removes a configured skill source only when no
active skills still depend on it. If active manifest or lockfile entries still
reference the source, it fails and tells the user to deactivate those skills
first. When safe, it removes the source entry, matching source metadata, and
the empty top-level `.agents/packages/skills/<source-name>` directory. It does
not recursively delete package contents.

`aix remove skills` without a source name provides an interactive picker over
configured manifest skill sources, then runs the same safety checks and removal
behavior as the explicit command. The picker lists removable sources by number,
places `q - Quit` directly after the selectable options, and shows blocked
sources under `To remove the following sources deactivate their skills first:`.

`aix activate skill <source>/<path> [alias]` exposes a materialized skill
through `.agents/skills/<active-name>`. Without an alias, activation normally
creates a symlink to the materialized package skill folder. With an alias,
activation may need a managed wrapper directory so the active `SKILL.md` front
matter `name:` matches the alias without mutating the package copy.

`aix activate skill` without a target should eventually provide an interactive
flow: list configured skill sources, let the user select a source by number,
list inactive skills from that source, and let the user select a skill by
number. The MVP may implement non-interactive activation first if terminal
prompts add too much risk.

`aix deactivate skill <active-name>` removes one active skill from
`.agents/skills` and updates manifest and lockfile state without deleting the
materialized package copy.

`aix init` initializes the local AI Extensions environment. It creates
`.agents/`, `.agents/packages/`, `.agents/skills/`, `aix.json`, and
`aix.lock.json`; writes Git source definitions for `aix`, `mattpocock`, and
`cursor-pstack`; installs the default workflow from remote source path
`aix/workflows/design-plan-execute`; fetches default source metadata; materializes
the package content needed by defaults; activates workflow-owned skills; and
activates `cursor-pstack/unslop` from the `cursor-pstack` source.

`aix.json` should declare user-requested root active skills as compact
`source:path` strings. Dependency-only skills inferred during activation belong
in `aix.lock.json` and `.agents/skills` while required, but they should not be
written to the manifest `skills` list unless the user explicitly activates
them. Object entries are reserved for aliases, per-skill refs, or later
metadata.

`aix activate skill` reads `aix.json`, resolves the cached source metadata,
materializes the requested package under `.agents/packages/skills`, validates
the requested skill, detects naming collisions, checks local drift against the
lockfile, creates the active symlink or wrapper under `.agents/skills`, hashes
package and active files, and writes `aix.lock.json` atomically.

`aix deactivate skill` reads `aix.json` and `aix.lock.json`, resolves the
active skill by active name, checks local drift against active file hashes,
removes the active entry when safe, and writes updated state atomically.

`aix update` intentionally refreshes locked Git commits plus package and active
file hashes. It must run the same local drift checks before changing files.

`aix diff` shows the difference between the locked package or active copy and
the currently resolved source version. It does not change project files.

`aix verify` checks that the manifest, lockfile, package files, active files,
hashes, skill front matter, and naming rules still agree.

File operations are safety-sensitive. All writes stay scoped to
`aix.json`, `aix.lock.json`, `.agents/`, `.agents/packages`, and
`.agents/skills` unless a command explicitly initializes missing project-owned
documentation folders. Workflow install may create missing `_docs` directories,
but routine workflow updates must not rewrite project-authored `_docs` content.
The MVP does not add registry support, plugin package support, external
workflow skill dependencies, global installs, workflow replacement, or per-tool
compatibility symlink management beyond keeping
`.codex/skills` and `.claude/skills` as optional directory-level symlinks to
`.agents/skills`.

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
- No automatic merges for locally edited package or active skill files.
- No routine updates to project-owned `_docs/` after initial folder creation.
- No package publishing to an unscoped `aix` npm package.
- No automatic release from unreviewed local changes.

## Boundaries And Invariants

- `.agents/` is package-managed agent process structure.
- `aix/workflows/design-plan-execute/` is the canonical default workflow source path
  inside the remote `aix` Git source.
- `aix/skills/` is transitional until default workflow-owned skills are moved
  under `aix/workflows/design-plan-execute/skills/`.
- `_docs/` is project-owned documentation.
- Source repositories are fetched into the shared Git cache.
- Active skill package copies live under `.agents/packages/skills/<source>/...`.
- Workflow package copies live under `.agents/packages/workflows/...`.
- Active skills live under `.agents/skills/<active-name>`.
- Only one workflow may be active at a time in the MVP.
- Workflow-owned skills cannot be deactivated directly with
  `aix deactivate skill`.
- Workflow install may create missing `_docs` directories but must not rewrite
  project-authored `_docs` documents.
- A skill folder is valid only when it contains a valid `SKILL.md`.
- Natural skill names are used unless the manifest declares an alias.
- Active-name collisions fail before changing `.agents/skills`.
- A local file that differs from the lockfile hash is treated as local drift.
- Activate, deactivate, and update must refuse to overwrite local drift.
- The lockfile records package kind, resolved Git commit SHAs, package file
  hashes, and active skill file hashes.
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
- ✅ Review & Refactor

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

### Phase 2: Init, Git sources, source metadata, and skill discovery (status: completed)

Goal: initialize the local AI Extensions environment, resolve configured Git
sources, fetch source metadata into the shared Git cache, and list valid skills
without changing active skills during discovery.

Tasks:

- ✅ Implement `aix init` to create `.agents/`, `.agents/packages`,
      `.agents/skills`, `aix.json`, and `aix.lock.json`; write default source
      definitions for `aix`, `mattpocock`, and `cursor-pstack`; fetch source
      metadata; materialize package content needed by defaults; activate all
      default skills from the `aix` Git source path `aix/skills`; and activate
      `cursor-pstack/unslop`.
      Previous implementation installed directly into `.agents/skills`, then
      was reworked to `.agents/packages/<source>/...`; revisit it for the
      type-scoped `.agents/packages/skills/<source>/...` package store and
      lockfile `kind: "skill"`.
- ✅ Define built-in default sources for `aix`, `mattpocock`, and
      `cursor-pstack`.
      The built-in `aix` source should resolve to
      `https://github.com/tekfoundry/ai-extensions.git` path `aix/skills` at ref
      `master`.
- ✅ Implement Git clone or fetch into a deterministic cache location.
- ✅ Resolve requested refs to exact commit SHAs.
- ✅ Implement cached source metadata so `aix add skills` and
      `aix list skills <source>` do not need to copy every discovered skill into
      `.agents/packages`.
- ✅ Implement `.agents/packages/skills/<source>/...` as the managed
      materialized package store for active skills.
- ✅ Replace the now-superseded
      `aix source <git-or-github-tree-url> [name]` command with
      `aix add skills <git-or-github-tree-url> [alias]`.
- ✅ Implement `aix remove skills <source-name>` with active-dependency
      protection.
- ✅ Normalize GitHub tree URLs into Git URL, ref, and source path.
- ✅ Prefetch source content into the shared Git cache when a source is added.
- ✅ Implement flat and nested skill discovery by finding folders containing
      `SKILL.md`.
- ✅ Validate `SKILL.md` front matter enough to require a usable `name`.
- ✅ Replace `aix list [source]` with `aix list skills [source]`, including an
      interactive `aix list` kind picker and `aix list skills` source picker.
- ✅ Adopt lightweight terminal UX dependencies behind the shared terminal UI
      wrapper so interactive prompts and color are consistent without requiring
      command modules to depend directly on third-party prompt APIs.
- ✅ Prove `aix list skills <source>` does not change `aix.json`, `aix.lock.json`,
      `.agents/packages`, or `.agents/skills`.
- ✅ Review & Refactor

Verification:

- command-level tests for `aix init` on an empty project and an already
  initialized project, including `.agents/packages`
- tests proving `aix init` does not overwrite local edits in `.agents/skills`,
  `.agents/packages`, `aix.json`, or `aix.lock.json`
- unit tests with local fixture Git repositories
- command-level tests for `aix add skills` with a normal Git URL and a GitHub
  tree URL
- command-level tests for `aix remove skills`, including refusal while active
  skills depend on the source
- tests proving source addition fetches and indexes sources without
  materializing package copies or activating skills
- opt-in integration tests against public remote Git sources are allowed, but
  should stay outside the default suite so routine verification remains
  deterministic
- command-level tests for `aix list skills aix`, flat discovery, nested discovery, and
  unknown sources
- mutation check around `aix list skills <source>`

Completion evidence:

- 2026-08-19: `npm test` passed with command-level `aix init` coverage.
- 2026-08-19: local fixture Git tests confirmed `aix init` writes `aix.json`
  and `aix.lock.json`, declares `aix`, `mattpocock`, and `cursor-pstack`
  sources, installed 12 skills from the `aix` Git source path `aix/skills`, and
  installed `cursor-pstack/unslop` from the `cursor-pstack` Git source under
  the previous direct-install model.
- 2026-08-19: `npm test` passed with local fixture Git coverage for clone,
  fetch/cache reuse, and exact commit resolution.
- 2026-08-19: `npm test` passed with flat and nested skill discovery,
  front-matter `name` validation, `aix list aix`, fixture Git source listing,
  unknown source failures, and mutation checks proving `aix list` does not
  write `aix.json`, `aix.lock.json`, or `.agents/skills`.
- 2026-08-19: Manifest parsing and `aix init` output were updated so normal
  skill declarations use compact `source:path` strings, with object entries
  still accepted when metadata such as aliases is needed.
- 2026-08-19: Later design review changed the model from direct install into
  `.agents/skills` to cached source metadata, materialized packages under
  `.agents/packages`, and explicit activation into `.agents/skills`. Phase 2
  has been reopened to reconcile `init`, source addition, and mutation checks
  with that design.
- 2026-08-19: Reworked `aix init` for the package-store model. Init now
  prefetches configured default Git sources, materializes default active skill
  packages under the now-superseded `.agents/packages/<source>/...` layout,
  activates non-aliased skills through `.agents/skills/<active-name>` symlinks,
  writes lockfile package and activation paths with separate file hashes,
  remains idempotent when files match, and refuses existing package or
  active-skill local edits. Verification passed with `npm run build`,
  `npm run typecheck`, targeted
  `node --test tests/init.test.mjs tests/lockfile.test.mjs`, and `npm test`
  with 27 passing tests.
- 2026-08-19: Fixed a stale shared-cache failure where a source name could
  point at an old remote URL and then fail resolving the new source ref, such
  as `origin/main`. Source resolution now updates the cached `origin` URL
  before fetching and reports unresolved refs as source/ref errors. The CLI init
  test now uses an isolated `AIX_CACHE_DIR` so tests do not pollute the user's
  default cache. Verification passed with targeted
  `node --test tests/sources.test.mjs tests/init.test.mjs` and `npm test` with
  28 passing tests.
- 2026-08-19: Design direction updated so package materialization is
  type-scoped. At that point, the MVP still used the now-superseded
  `aix source <url> [name]` command for skill sources, but active skill package
  copies moved to `.agents/packages/skills/<source>/...` and lockfile entries
  recorded `kind: "skill"`. This reopened the init/package-store
  implementation slice.
- 2026-08-19: Reworked init and lockfile parsing for type-scoped skill
  packages. Init now materializes active default skills under
  `.agents/packages/skills/<source>/...`, creates active symlinks to that path,
  writes `kind: "skill"` in each lockfile skill entry, and keeps local drift
  checks on package and active paths. Verification passed with
  `npm run build`, `npm run typecheck`,
  `node --test tests/init.test.mjs tests/lockfile.test.mjs`, `npm test` with
  30 passing tests, and `git diff --check`. Running `npm run aix init` in this
  repository correctly stopped at `Refusing to overwrite local edit:
  aix.lock.json` because local generated artifacts from the previous layout are
  still present.
- 2026-08-19: Expanded `aix list` mutation coverage to assert that source and
  skill listing do not create or modify `aix.lock.json`, `.agents/packages`,
  `.agents/packages/skills`, or `.agents/skills`. Verification passed with
  `node --test tests/skills.test.mjs`.
- 2026-08-19: Implemented the now-superseded
  `aix source <git-or-github-tree-url> [name]`. Source addition wrote or
  preserved a manifest source entry, normalized GitHub tree URLs through the
  manifest parser, prefetched the Git source into the shared cache, discovered
  skills, and wrote validated source metadata to the cache without creating
  `aix.lock.json`, `.agents/packages`, or `.agents/skills`.
  `aix list <source>` used matching source metadata before fetching.
  Verification passed with targeted
  `node --test tests/sources.test.mjs tests/skills.test.mjs tests/manifest.test.mjs tests/cli.test.mjs`.
- 2026-08-19: Phase 2 completion verification previously passed with
  `npm test` at 33 passing tests and `git diff --check`. Later UX review
  reopened Phase 2 so source management can use `aix add skills` and
  `aix remove skills`.
- 2026-08-19: Replaced the superseded `aix source` command with
  `aix add skills <git-or-github-tree-url> [alias]` and implemented
  `aix remove skills <source-name>`. Source removal updates `aix.json`,
  removes matching cached source metadata, refuses removal while manifest
  or lockfile skills still depend on the source, removes the empty top-level
  `.agents/packages/skills/<source>` directory, and does not create or delete
  `aix.lock.json` or `.agents/skills`. Verification passed with `npm run build`,
  `node --test tests/sources.test.mjs tests/cli.test.mjs tests/manifest.test.mjs`,
  `npm run typecheck`, `npm test` with 38 passing tests, and
  `git diff --check`.
- 2026-08-19: Scoped the npm test script to `node --test tests` so test
  discovery does not traverse package-managed agent compatibility symlinks such
  as `.claude/skills`. Init tests now create a deterministic local `unslop`
  fixture instead of copying from the mutable `.agents/skills` workspace.
- 2026-08-19: Updated manifest source shape so commands write skill sources
  under `sources.skills`, preserving room for later source kinds such as
  `sources.agents` or `sources.automations`. Manifest parsing still tolerates
  the earlier flat `sources` shape during the MVP transition.
- 2026-08-19: Added an interactive `aix remove skills` path. With no source
  name, the CLI lists configured manifest skill sources by number, prompts for
  a selection, and then runs the same remove checks as
  `aix remove skills <source-name>`. Blocked sources remain visible under the
  deactivation-first heading, and the menu supports `q - Quit`.
- 2026-08-19: Factored reusable terminal selection rendering into
  `src/terminal-ui.ts` so later interactive commands can pass option values,
  labels, and details into a shared picker that returns the selected value or
  `undefined` for `q - Quit`. The helper also centralizes menu numbering,
  optional sections, and TTY-only ANSI styling without coupling UI formatting
  to source-management behavior.
- 2026-08-19: Replaced the durable list grammar with `aix list skills
  <source>`. `aix list` now opens a kind picker with `skills` and `q - Quit`,
  while `aix list skills` opens a source picker before listing skills.
  Verification passed with `npm run build`,
  `node --test tests/cli.test.mjs tests/skills.test.mjs tests/sources.test.mjs`,
  `npm run typecheck`, `npm test`, and `git diff --check`.
- 2026-08-19: Added a reusable terminal table renderer and changed
  `aix list skills <source>` output from raw tab-separated rows to a titled
  table with `Path` and `Name` columns.
- 2026-08-19: Added `@inquirer/prompts` and `yoctocolors` behind
  `src/terminal-ui.ts`. Real TTY selection menus now use an established prompt
  package, while piped streams and tests keep the existing numeric `q - Quit`
  fallback. The package engine was tightened to Node `>=20.17` to match the
  prompt dependency tree. Verification passed with `npm run build`,
  `npm run typecheck`, `npm test` with 46 passing tests, and
  `git diff --check`.

### Phase 3: Source and command module organization (status: completed)

Goal: organize the TypeScript source tree so generated `dist` output is easy
to navigate and command ownership is clear before activation and update logic
add more files.

Tasks:

- ✅ Move command implementations into a command-focused source area, such as
      `src/cli/cmds/`, with one maintainable module per command family.
- ✅ Move reusable terminal UI helpers into a UI-focused source area, such as
      `src/ui/`, so generated files land under `dist/ui/`.
- ✅ Keep domain modules such as manifest, lockfile, sources, skills, and init
      separate from command orchestration modules.
- ✅ Update imports, tests, and generated output expectations after the move.
- ✅ Keep public CLI behavior unchanged during the refactor.
- ✅ Define a shared command interface so each command owns its name, summary,
      splash/help metadata, and execution entrypoint.
- ✅ Register supported commands through an explicit command registry and render
      the splash command list from command metadata instead of duplicated CLI
      strings. Defer filesystem-based dynamic discovery until command count or
      packaging needs justify it.
- ✅ Split shared application errors from CLI-specific usage and exit-code
      mapping so domain modules remain independent of command handling.
- ✅ Group source-domain behavior under `src/sources/` so defaults, Git
      resolution, source metadata, source types, and add/remove source workflows
      are no longer scattered across root-level source files.
- ✅ Split init orchestration into `src/init/` while promoting reusable
      filesystem helpers and product-wide `.agents` path helpers into shared
      module groups.
- ✅ Split lockfile parsing, IO, and lockfile-specific errors into
      `src/lockfile/` while preserving the root `src/lockfile.ts` facade.
- ✅ Split manifest parsing, IO, source parsing, skill parsing, and
      manifest-specific errors into `src/manifest/`; promote shared record
      validation into `src/validation/`.
- ✅ Split skill discovery, source-backed listing, rendering, and skill-domain
      types into `src/skills/`; reuse skills-domain parsing from init.
- ✅ Review & Refactor

Verification:

- targeted tests for moved command and UI modules
- `npm run build`
- `npm run typecheck`
- `npm test`
- `git diff --check`

Completion evidence:

- 2026-08-19: Moved command orchestration into `src/cli/cmds/` with command-family
  modules for init, list, and source add/remove behavior. The CLI implementation
  owns dispatch, help output, error mapping, and process output.
- 2026-08-19: Refined command organization so implemented top-level commands
  have matching command modules: `add`, `init`, `list`, and `remove`. Shared
  source-management behavior moved to `src/source-management.ts`.
- 2026-08-19: Moved CLI support into `src/cli/` so `src/cli/cmds/` contains
  only command modules. Registry, pending command definitions, command types,
  and the CLI implementation live at the CLI support level. The root
  `src/cli.ts` remains a thin package-facing facade for the existing binary
  import path.
- 2026-08-19: Moved reusable terminal UI helpers into `src/ui/` and split
  element wrappers into `selection-prompt` and `table` modules. Prompt/color
  package details stay hidden behind those project-owned UI wrappers.
- 2026-08-19: Added a shared command interface and explicit command registry.
  Each command object owns its name, usage, splash text, summary, and execution
  entrypoint. The root CLI now renders the splash command list and dispatches
  commands from registry metadata instead of duplicating command strings.
  Filesystem-based command discovery remains deferred.
- 2026-08-19: Rebuilt `dist` from a clean directory so generated output mirrors
  the organized source tree. The stale root `dist/source-command.*` and
  `dist/terminal-ui.*` files are gone.
- 2026-08-19: Verification passed with `npm run build`, targeted
  `node --test tests/cli.test.mjs tests/ui-selection-prompt.test.mjs tests/sources.test.mjs tests/skills.test.mjs`,
  `npm run typecheck`, `npm test` with 46 passing tests, and
  `git diff --check`.
- 2026-08-19: Split reusable `AixError` from CLI-specific `CliError`,
  usage errors, and exit-code mapping. Shared source, skill, and init modules
  now throw application errors while command modules own usage failures.
  Verification passed with `npm run build`, `npm run typecheck`, targeted
  `node --test tests/cli.test.mjs tests/sources.test.mjs tests/init.test.mjs tests/skills.test.mjs`,
  `npm test` with 47 passing tests, and `git diff --check`.
- 2026-08-19: Moved source-domain behavior into `src/sources/` with focused
  modules for defaults, Git resolution, source metadata, source types, and
  add/remove source workflows. Removed stale root generated files for defaults,
  sources, and source management so `dist/sources/` mirrors the new source
  layout. Verification passed with `npm run build`, targeted
  `node --test tests/sources.test.mjs tests/skills.test.mjs tests/cli.test.mjs tests/init.test.mjs`,
  `npm run typecheck`, `npm test` with 47 passing tests, and
  `git diff --check`.
- 2026-08-19: Split init orchestration into `src/init/` modules for project
  orchestration, default skill selection, manifest creation, lockfile creation,
  activation safety, rendering, and init types. Promoted recursive file
  listing, safe copy, hashing, atomic JSON writes, and `.agents` path helpers
  into shared `src/fs/` and `src/paths/` module groups. Targeted init and CLI
  tests passed after the move. Verification passed with `npm run build`,
  targeted `node --test tests/init.test.mjs tests/cli.test.mjs`,
  `npm run typecheck`, `npm test` with 47 passing tests, and
  `git diff --check`.
- 2026-08-19: Split general lockfile behavior into `src/lockfile/` modules
  for parsing, IO, and lockfile-specific errors while preserving the root
  `src/lockfile.ts` facade. Targeted lockfile and source-management tests
  passed after the move. Verification passed with `npm run build`, targeted
  `node --test tests/lockfile.test.mjs tests/sources.test.mjs`,
  `npm run typecheck`, `npm test` with 47 passing tests, and
  `git diff --check`.
- 2026-08-19: Split manifest behavior into `src/manifest/` modules for IO,
  whole-manifest parsing, source parsing, skill request parsing, string
  validation, and manifest-specific errors while preserving the root
  `src/manifest.ts` facade. Promoted the shared `isRecord` helper into
  `src/validation/`. Targeted manifest, source, and lockfile tests passed
  after the move. Verification passed with `npm run build`, targeted
  `node --test tests/manifest.test.mjs tests/sources.test.mjs tests/lockfile.test.mjs`,
  `npm run typecheck`, `npm test` with 47 passing tests, and
  `git diff --check`.
- 2026-08-20: Split skill behavior into `src/skills/` modules for discovery,
  source-backed listing, rendering, and skill-domain types while preserving the
  root `src/skills.ts` facade. Init now reuses the skills-domain parser for
  `SKILL.md` names instead of carrying its own copy. Targeted skill, init,
  source, and CLI tests passed after the move. Verification passed with
  `npm run build`, targeted
  `node --test tests/skills.test.mjs tests/init.test.mjs tests/sources.test.mjs tests/cli.test.mjs`,
  `npm run typecheck`, `npm test` with 47 passing tests, and
  `git diff --check`.

### Phase 4: Activation, deactivation, and lockfile integrity (status: completed)

Goal: materialize declared or requested skill packages, activate them into
`.agents/skills`, deactivate active skills when requested, and record exact
package plus activation lockfile state.

Tasks:

- ✅ Implement activation selection from declared manifest entries and targeted
      `aix activate skill <source>/<path> [alias]`.
- ✅ Decide before implementation whether no-argument `aix activate skill`
      ships with an interactive source/skill picker in the MVP or is explicitly
      deferred after non-interactive activation works.
- ✅ Locate requested source-relative skill paths.
- ✅ Determine active names from natural names or aliases.
- ✅ Validate aliases as safe folder names.
- ✅ Detect active-name collisions before changing `.agents/skills`.
- ✅ Create direct symlinks for non-aliased activation when safe.
- ✅ Create managed wrapper or materialized active directories for aliases when
      needed so `SKILL.md` front matter matches the alias.
- ✅ Hash package files and active skill files with SHA-256.
- ✅ Write lockfile entries with source URL, requested ref, resolved commit,
      package kind, source path, package path, activation path, original name,
      active name, alias metadata, and file hashes.
- ✅ Implement `aix deactivate skill <active-name>` with local-drift checks,
      manifest updates, lockfile updates, and safe package-copy cleanup.
- ✅ Preserve package-managed and project-owned boundaries during activation.
- ✅ Infer and lock skill dependency trees during activation, auto-activate
      unambiguous dependencies, and refuse deactivation when another active
      skill depends on the requested active skill.
- ✅ Add interactive `aix deactivate` and `aix deactivate skill` picker flows.
- ✅ Update design docs so `aix.json.skills` represents user-requested root
      active skills while dependency-only active skills live in `aix.lock.json`.
- ✅ Update activation so inferred dependency-only skills are activated and
      locked without being added to `aix.json.skills`.
- ✅ Mark lockfile skill entries as user-requested roots or dependency-only
      activations.
- ✅ Update deactivation so removing a root skill also removes orphaned
      dependency-only active skills while preserving package copies.
- ✅ Keep direct deactivation of dependency-only skills blocked while active
      skills still depend on them.
- ✅ Add regression coverage for manifest root-only activation and dependency
      cleanup on deactivation.
- ✅ Update interactive deactivation so dependency-only active skills are not
      shown as selectable root deactivation options.
- ✅ Update design docs so deactivate symmetrically removes no-longer-needed
      package copies when package files are unchanged, and activation refuses
      ambiguous existing package directories.
- ✅ Update deactivation to remove no-longer-needed package copies after
      package hash checks.
- ✅ Update activation to refuse existing untracked package directories that do
      not match the resolved source skill.
- ✅ Add regression coverage for package cleanup, package local-edit refusal,
      and dirty orphan package activation refusal.
- ✅ Remove empty package parent directories after package-copy cleanup without
      deleting past the managed skills package boundary.
- ✅ Review & Refactor

Verification:

- unit tests for name resolution, alias validation, collision detection,
  symlink creation, alias wrapper creation, hashing, deactivation, and lockfile
  content
- command-level activation and deactivation tests using local fixture Git
  repositories
- interactive activation tests if the no-argument picker ships in the MVP
- `npm run typecheck`
- `npm test`

Completion evidence:

- 2026-08-20: Implemented `aix activate skill <source>/<path> [alias]` so
  activation materializes the package under `.agents/packages/skills`, updates
  the activated `skills` list in `aix.json`, creates a direct symlink for
  natural-name activation, creates a managed active wrapper for aliases with
  alias-matched `SKILL.md` front matter, and writes lockfile package plus
  active file hashes. Added the no-argument interactive source and skill
  picker for `aix activate skill`. Verification passed with `npm run build`,
  targeted `node --test tests/activation.test.mjs`, `npm run typecheck`,
  `npm test` with 51 passing tests, and `git diff --check`.
- 2026-08-20: Implemented `aix deactivate skill <active-name>` so
  deactivation resolves active skills by lockfile active name, refuses edited
  active files, removes only `.agents/skills/<active-name>`, removes the
  matching activated skill from `aix.json`, removes the lockfile entry, and
  preserves `.agents/packages/skills/<source>/...`. Updated design docs for
  the accepted activation manifest-write and interactive picker behavior.
  Verification passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs`, `npm run typecheck`, `npm test`
  with 53 passing tests, and `git diff --check`.
- 2026-08-20: Reopened Phase 4 for inferred skill dependency handling.
  Activation now infers dependencies from `SKILL.md` skill-tool call
  instructions such as `Call the Skill tool with "grilling"`, resolves them
  unambiguously against discovered skills in the same source, activates
  dependencies before the requested skill, records dependency edges in
  `aix.lock.json`, and reports activated dependencies in CLI output.
  Deactivation now refuses to remove active skills that another active lockfile
  entry depends on. The review and refactor pass kept dependency behavior in
  focused activation-domain modules rather than broadening command modules.
  Verification passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs`, `npm run typecheck`, `npm test`
  with 57 passing tests, and `git diff --check`.
- 2026-08-20: Added interactive deactivation UX. `aix deactivate` now opens a
  kind picker with `Skills` and `q - Quit`, while `aix deactivate skill`
  without a target lists active skills from the lockfile and deactivates the
  selected active skill through the same local-drift and dependency guards as
  the explicit command. Updated CLI design docs for the picker behavior.
  Verification passed with `npm run build`, `npm run typecheck`, targeted
  `node --test tests/activation.test.mjs`, `npm test` with 60 passing tests,
  and `git diff --check`.
- 2026-08-20: Reopened Phase 4 to align dependency activation/deactivation
  with package-manager root versus transitive dependency behavior. Activation
  now writes only the user-selected root skill to `aix.json.skills`, marks
  lockfile entries with `requested: true` for roots and `requested: false` for
  inferred dependency-only activations, and keeps dependency edges in
  `aix.lock.json`. Deactivation still refuses direct removal of a
  dependency-only skill while active skills depend on it, but removing a root
  skill now prunes orphaned dependency-only active skills from
  `.agents/skills` and the lockfile while preserving package copies under
  `.agents/packages/skills`. The review and refactor pass added a guard
  against reactivating an already-active source skill under a different active
  name. Verification passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs`, `npm run typecheck`, `npm test`
  with 62 passing tests, and `git diff --check`.
- 2026-08-20: Reopened Phase 4 for a deactivation picker UX correction.
  Interactive `aix deactivate` and `aix deactivate skill` now list only
  user-requested root active skills, omitting dependency-only active skills
  because root deactivation owns dependency cleanup. Non-interactive direct
  deactivation of a dependency-only skill remains blocked while active skills
  depend on it. Updated design docs and regression coverage. Verification
  passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs`, `npm run typecheck`, `npm test`
  with 62 passing tests, and `git diff --check`.
- 2026-08-20: Reopened Phase 4 to make deactivation symmetrical with
  activation for project-local package copies. Deactivation now checks package
  files against lockfile hashes, refuses to remove locally edited package
  copies, removes no-longer-needed package directories for deactivated roots
  and pruned dependency-only skills, and reports removed packages in command
  output. Activation now refuses dirty untracked package directories instead
  of overwriting ambiguous local files. The review and refactor pass moved
  package hash comparison, orphan package validation, and package removal into
  a focused activation package-file helper. Verification passed with
  `npm run build`, targeted `node --test tests/activation.test.mjs`,
  `npm run typecheck`, `npm test` with 64 passing tests, and
  `git diff --check`.
- 2026-08-20: Reopened Phase 4 to clean up empty package parent directories
  after deactivation removes package copies. Package cleanup now removes empty
  parents below `.agents/packages/skills`, stops at the first non-empty parent,
  and never removes the managed skills package root. Regression coverage proves
  empty parents are removed and non-empty parents with sibling packages remain.
  Verification passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs`, `npm run typecheck`, `npm test`
  with 65 passing tests, and `git diff --check`.

### Phase 5: Drift protection, update, diff, and verify (status: completed)

Goal: make repeated use safe. AI Extensions should detect local edits, show
pending changes, and check fetched package plus active skill state.

Tasks:

- ✅ Implement lockfile hash comparison against package and active skill files.
- ✅ Fail activate, deactivate, and update when local drift is detected.
- ✅ Implement `aix update` for all locked skills.
- ✅ Implement targeted update filtering if the command shape is accepted.
- ✅ Implement `aix diff` against the currently resolved source version.
- ✅ Implement targeted diff filtering if the command shape is accepted.
- ✅ Implement `aix verify` for manifest, lockfile, package files, active
      files, hashes, skill front matter, aliases, and collision rules.
- ✅ Add actionable error messages for drift, missing package or active files,
      lockfile mismatch, unresolved sources, and invalid skills.
- ✅ Review & Refactor

Verification:

- unit tests for drift detection and verification failures
- command-level tests for update, diff, verify, and targeted filters
- tests proving locally edited files are not overwritten
- `npm run typecheck`
- `npm test`

Completion evidence:

- 2026-08-20: Added shared lockfile hash comparison helpers that compute
  package or active file hashes, compare them with lockfile records, and report
  missing roots, missing files, changed files, and unexpected files. Existing
  activation/deactivation package and active-file safety checks now use the
  shared comparison path while preserving their command-specific refusal
  messages. Verification passed with `npm run build`, targeted
  `node --test tests/lockfile-drift.test.mjs tests/activation.test.mjs`,
  `npm run typecheck`, `npm test` with 69 passing tests, and
  `git diff --check`.
  The next drift task remains open because its `update` behavior depends on
  implementing the `aix update` command.
- 2026-08-20: Implemented `aix update` for all locked skills. Update now
  validates the manifest and lockfile, refuses package or active-file drift
  before changing files, resolves each locked source to the latest requested
  Git ref, refreshes managed package copies, refreshes alias wrappers while
  preserving active names, updates package and active file hashes, and writes
  `aix.lock.json` atomically. Source resolution now treats an omitted ref as
  `origin/HEAD` after fetch instead of the cache worktree's detached `HEAD`,
  so repeated updates can see new default-branch commits. Activation now also
  checks active-file drift before refreshing an already-locked active skill.
  Verification passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs tests/update.test.mjs tests/lockfile-drift.test.mjs`,
  `npm run typecheck`, `npm test` with 75 passing tests, and
  `git diff --check`.
- 2026-08-20: Implemented targeted `aix update <source>/<path>` filtering for
  exact locked skill entries. Targeted update refreshes only the matching
  package and active skill state, leaves sibling lockfile entries and package
  copies unchanged, and fails clearly for unknown locked targets. Verification
  passed with `npm run build`, targeted `node --test tests/update.test.mjs`,
  `npm run typecheck`, `npm test` with 77 passing tests, and
  `git diff --check`.
- 2026-08-20: Implemented `aix diff` for all locked skills. Diff resolves each
  locked source to the currently requested Git ref, compares managed package
  copies against the resolved source with Git no-index diff, reports pending
  source changes, and leaves `aix.lock.json` plus package files unchanged.
  Verification passed with `npm run build`, targeted
  `node --test tests/diff.test.mjs`, `npm run typecheck`, `npm test` with 80
  passing tests, and `git diff --check`.
- 2026-08-20: Implemented targeted `aix diff <source>/<path>` filtering for
  exact locked skill entries. Targeted diff reports only the requested locked
  skill, leaves sibling package and lockfile state untouched, and fails clearly
  for unknown locked targets. Verification passed with `npm run build`,
  targeted `node --test tests/diff.test.mjs`, `npm run typecheck`, `npm test`
  with 82 passing tests, and `git diff --check`.
- 2026-08-20: Implemented `aix verify` for local manifest, lockfile, package,
  and active skill consistency. Verify reports hash drift, missing package or
  active files, unexpected files, invalid `SKILL.md` front matter, alias and
  active-name mismatches, lockfile path mismatches, active-name collisions, and
  manifest root skills missing from the lockfile. Verification passed with
  `npm run build`, targeted `node --test tests/verify.test.mjs tests/cli.test.mjs`,
  `npm run typecheck`, `npm test` with 86 passing tests, and
  `git diff --check`.
- 2026-08-20: Improved drift refusal diagnostics so activate, deactivate, and
  update report operation-specific messages such as `refresh`, `remove`, or
  `update` instead of reusing deactivation wording for every path. Verify
  diagnostics cover missing package or active paths, missing locked files,
  changed hashes, unexpected files, lockfile path mismatches, unresolved
  manifest-to-lockfile roots, and invalid skill front matter. Verification
  passed with `npm run build`, targeted
  `node --test tests/activation.test.mjs tests/update.test.mjs`,
  `npm run typecheck`, `npm test` with 86 passing tests, and
  `git diff --check`.
- 2026-08-20: Completed the Phase 5 review and refactor pass. Update now
  precomputes and validates resolved source skill paths and front matter before
  replacing any managed package files, reducing partial-update risk when an
  upstream source removes or invalidates a later locked skill. Stable design
  documentation was promoted to record omitted-ref behavior: update and diff
  resolve `origin/HEAD` after fetch instead of the cache worktree's detached
  `HEAD`. Verification passed with `npm run build`, targeted
  `node --test tests/update.test.mjs`, `npm run typecheck`, `npm test` with
  86 passing tests, and `git diff --check`.

### Phase 6: Package readiness (status: completed)

Goal: make the package understandable, buildable, and locally packable.

Tasks:

- ✅ Add package metadata for scoped npm distribution with the `aix` binary.
- ✅ Add README usage examples that match implemented behavior.
- ✅ Document manifest and lockfile examples.
- ✅ Document the default sources and the Git-only MVP boundary.
- ✅ Add a local package smoke test using `npm pack` or equivalent.
- ✅ Run full verification.
- ✅ Review & Refactor

Verification:

- `npm run build`
- `npm run typecheck`
- `npm test`
- local packed CLI smoke test

Completion evidence:

- 2026-08-20: Added npm-facing package metadata for the scoped
  `@tekfoundry/aix` package, including repository, bugs, homepage, keywords,
  package manager, public scoped-package publish config, and the existing
  `aix` binary declaration. Removed a stale `LICENSE` package-file include
  because no `LICENSE` file exists yet. Refreshed `package-lock.json` with
  `npm_config_cache=/private/tmp/aix-npm-cache npm install --package-lock-only
  --ignore-scripts --no-audit`. A first `npm pack --dry-run --json` was
  blocked by root-owned files in `/Users/rcravens/.npm`; rerunning with the
  temporary npm cache passed and listed `bin/aix.js`, `dist`, `aix/skills`,
  `README.md`, and `package.json` in the pack preview.
- 2026-08-20: Reworked `README.md` into current package documentation with
  install guidance, quick-start command examples, the implemented command list,
  manifest and lockfile examples, default sources, and Git-only MVP
  boundaries. Applied the `unslop` skill's audit by removing stale future-tense
  claims and checking for obvious AI-copy markers, including em dashes and
  filler phrases. No targeted code test was needed for the README-only slice.
- 2026-08-20: Added `tests/package-smoke.test.mjs`, which runs `npm pack` into
  a temporary directory, unpacks the tarball, checks package metadata and
  expected packaged files, and runs the packed `bin/aix.js --help` entrypoint
  with local runtime dependencies linked into the unpacked package. A first
  version tried to install the tarball into a clean temp project and was
  stopped after hanging on dependency resolution. Verification passed with
  `npm_config_cache=/private/tmp/aix-npm-cache node --test
  tests/package-smoke.test.mjs`.
- 2026-08-20: Full Phase 6 verification passed with
  `npm_config_cache=/private/tmp/aix-npm-cache npm run build`,
  `npm_config_cache=/private/tmp/aix-npm-cache npm run typecheck`,
  `npm_config_cache=/private/tmp/aix-npm-cache npm test` with 87 passing
  tests, `npm_config_cache=/private/tmp/aix-npm-cache npm pack --dry-run
  --json`, and `git diff --check`.
- 2026-08-20: Completed the Phase 6 review and refactor pass. No code
  refactor was needed after diff review. Promoted the package metadata decision
  to `_docs/design/cli.md`, including the scoped package name, `aix` binary
  mapping, and public scoped-package publish config. The license decision
  remains intentionally unresolved because the plan does not authorize choosing
  one.

### Phase 7: Workflow packaging and installation (status: completed)

Goal: make the default AI Agent Workflow an installable AI asset that owns
`.agents` process docs and workflow-local skills.

Tasks:

- ✅ Restructure the local `aix` package source so the default workflow lives
      under `aix/workflows/design-plan-execute/`.
- ✅ Add a small `workflow.json` install manifest for the default workflow.
- ✅ Add `AGENTS.append.md` to the workflow package with the root
      `AGENTS.md` managed-block content that ties agents into `.agents`
      workflow docs.
- ✅ Move or copy the reusable workflow docs into that workflow package:
      `README.md`, `workflow.md`, and `engineering-best-practices.md`.
- ✅ Move the default lifecycle skills into
      `aix/workflows/design-plan-execute/skills/` so the workflow and its owned
      skills ship together.
- ✅ Preserve compatibility for the existing `aix/skills` source path only as
      long as needed for migration, tests, or current init behavior.
- ✅ Define workflow source and active workflow types in the manifest and
      lockfile model.
- ✅ Add workflow lockfile entries for installed docs, workflow-local package
      files, active skill files, the root `AGENTS.md` managed block, resolved
      Git commit, and owner metadata.
- ✅ Implement workflow manifest parsing and validation for `workflow.json`,
      keeping the manifest focused on install integration rather than external
      dependency resolution.
- ✅ Implement conventional workflow discovery using `workflow.json`, known
      workflow doc names, and `skills/` layout.
- ✅ Implement `aix install workflow <git-or-github-tree-url> [alias]` as a
      one-step fetch, install, and lock workflow operation.
- ✅ Enforce one active workflow at a time and defer explicit workflow
      replacement.
- ✅ Install recognized workflow docs into `.agents/` with local drift checks.
- ✅ Insert or update the workflow-managed block in root `AGENTS.md` from
      `AGENTS.append.md`, preserving all project-owned content outside the
      managed markers.
- ✅ Materialize workflow-local skills under `.agents/packages/workflows/...`
      and expose them through `.agents/skills`.
- ✅ Mark workflow-owned skills so `aix deactivate skill <active-name>` refuses
      to remove them directly.
- ✅ Scaffold missing `_docs/design`, `_docs/plans`, `_docs/plans/backlog`,
      and `_docs/plans/completed` directories during workflow install without
      overwriting project-owned docs.
- ✅ Update `aix init` to install the default workflow instead of activating
      loose default skills from `aix/skills`.
- ✅ Implement `aix remove workflow` with drift checks, workflow doc removal,
      workflow-owned skill cleanup, managed `AGENTS.md` block removal, and no
      deletion of project-owned `AGENTS.md` or `_docs` content.
- ✅ Implement `aix diff workflow` for locked workflow docs, the managed
      `AGENTS.md` block, and workflow-owned skills.
- ✅ Implement `aix update workflow` with preflight source validation and local
      drift refusal for workflow docs, the managed `AGENTS.md` block, and
      workflow-owned skills.
- ✅ Extend `aix verify` to validate active workflow manifest, lockfile,
      workflow docs, the managed `AGENTS.md` block, workflow-owned skills,
      hashes, owner metadata, and one active workflow invariants.
- ✅ Update command help, splash metadata, terminal output, and README examples
      for workflow install, update, diff, remove, and verify.
- ✅ Add regression coverage for install, one-workflow guard, drift refusal,
      root `AGENTS.md` managed-block preservation, workflow-owned skill
      deactivation refusal, update, diff, remove, verify, and init integration.
- ✅ Review & Refactor

Verification:

- targeted workflow command tests using local fixture Git repositories
- init tests proving default workflow installation
- deactivate tests proving workflow-owned skills cannot be removed directly
- verify tests for workflow docs, workflow-owned skills, hashes, and owner
  metadata
- tests proving `AGENTS.md` content outside the managed block is preserved
- `npm run build`
- `npm run typecheck`
- `npm test`
- `git diff --check`

Completion evidence:

- 2026-08-20: Created the initial tracked workflow source directory at
  `aix/workflows/design-plan-execute/` with a temporary `.gitkeep` so the
  package path is visible before moving docs or skills. Aligned the active
  design docs and Phase 7 plan references to the agreed
  `design-plan-execute` workflow name. The workflow manifest,
  `AGENTS.append.md`, workflow docs, and workflow-owned skill moves remain open
  as separate Phase 7 tasks.
- 2026-08-20: Packaged the default workflow under
  `aix/workflows/design-plan-execute/` with `workflow.json`,
  `AGENTS.append.md`, workflow docs, and workflow-owned skills while preserving
  the transitional `aix/skills` source path.
- 2026-08-20: Implemented workflow manifest and lockfile support,
  `aix install workflow`, `aix remove workflow`, `aix diff workflow`,
  `aix update workflow`, workflow verification, root `AGENTS.md` managed-block
  handling, `_docs` scaffolding, and workflow-owned skill protection for
  direct deactivate/update/diff paths.
- 2026-08-20: Updated `aix init` so the default install unit is the
  `design-plan-execute` workflow. Added workflow command regression coverage
  for install, one-workflow guard, drift refusal, `AGENTS.md` preservation,
  workflow-owned skill deactivation refusal, update, diff, remove, verify, and
  init integration.
- 2026-08-20: Updated README command examples and user-facing command output
  for workflow install, update, diff, remove, verify, and init. Review pass
  removed stale workflow path examples and kept the existing `aix/skills` path
  documented only as transitional compatibility.
- 2026-08-20: Verification passed with
  `npm_config_cache=/private/tmp/aix-npm-cache npm run build`,
  `npm_config_cache=/private/tmp/aix-npm-cache npm run typecheck`,
  `npm_config_cache=/private/tmp/aix-npm-cache npm test` with 92 passing tests,
  and `git diff --check`.
- 2026-08-20: Reopened the review task after the maintainability retrospective.
  Split the 718-line `src/workflows/index.ts` all-in-one module into focused
  workflow modules for manifest parsing, source normalization, managed
  `AGENTS.md` blocks, workflow docs, workflow-owned skills, diff helpers,
  install, remove, update, shared helpers, and exports. The workflow package
  install path now stages source files and completes drift/collision preflight
  before replacing the managed package, and `aix remove workflow` now refuses
  modified workflow package files before deletion. The maintainability scan
  showed the largest workflow production file is now `src/workflows/install.ts`
  at 162 lines. Verification passed with `npm_config_cache=/private/tmp/aix-npm-cache npm run build`,
  targeted `node --test tests/workflow.test.mjs`,
  `npm_config_cache=/private/tmp/aix-npm-cache npm run typecheck`,
  `npm_config_cache=/private/tmp/aix-npm-cache npm test` with 92 passing tests,
  and `git diff --check`.

### Phase 8: Repeatable versioning and publishing (status: accepted)

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
- ⬜️ Review & Refactor

Verification:

- CI build, typecheck, and test workflow passes
- release dry run or equivalent publish preview passes
- package contents check confirms only intended files are included
- `npm install -g @tekfoundry/aix` or an equivalent clean-environment install
  succeeds after publish
- installed `aix --help` and at least one read-only command run successfully

## Open Questions / Decisions

- Manifest shape: define the exact JSON schema before Phase 1 implementation.
- Activation declaration behavior: decided on 2026-08-20. `aix activate skill
  <source>/<path> [alias]` updates the `skills` list in `aix.json` only for
  the user-selected root skill. Inferred dependency-only active skills are
  recorded in `aix.lock.json` and materialized under `.agents/skills`, but are
  not manifest entries unless the user explicitly activates them.
- Interactive activation behavior: decided on 2026-08-20. No-argument
  `aix activate skill` ships with an interactive source/skill picker in the
  MVP.
- Git cache location: decide before Phase 2 whether the cache lives under a
  project-local path, an OS cache directory, or a temporary test-controlled
  location.
- Built-in `aix` source packaging: keep `aix/skills` as the source path inside
  `https://github.com/tekfoundry/ai-extensions.git` at ref `master`.
  Superseded for the default workflow on 2026-08-20: restructure the built-in
  source so the AI Agent Workflow lives under
  `aix/workflows/design-plan-execute/` with workflow docs and workflow-owned skills
  together. Keep `aix/skills` only as transitional compatibility while the
  workflow phase migrates init and tests.
- Diff format: decide before Phase 5 whether MVP output is unified diff text,
  a structured summary, or both.
- Initialization behavior: decide before Phase 6 whether `aix activate skill`
  may scaffold missing `.agents` and `_docs` folders, or whether that belongs
  to a later explicit command.
- Workflow package format: decided on 2026-08-20 and refined later the same
  day. The first workflow package uses a small `workflow.json` install
  manifest plus conventional `docs` and `skills/` layout. The manifest declares
  install integration points such as root `AGENTS.md`; Markdown append content
  lives in `AGENTS.append.md`, not inline JSON.
- Workflow dependencies: decided on 2026-08-20. Workflow-owned skills must live
  inside the workflow package for the MVP. External workflow skill dependencies
  are deferred.
- Workflow lifecycle: decided on 2026-08-20. Workflows use
  `aix install workflow` as a one-step install path rather than `add` plus
  `activate`, and only one workflow may be active at a time.
- Workflow-owned skill removal: decided on 2026-08-20.
  `aix deactivate skill` must refuse direct removal of workflow-owned skills.
- Root agent instructions: decided on 2026-08-20. Workflow install updates root
  `AGENTS.md` through a marker-delimited managed block. Content outside that
  block remains project-owned.
- Release workflow: choose before Phase 8 whether to use Changesets,
  semantic-release, or a simpler npm-version workflow.
- Publish trigger: choose before Phase 8 whether releases are triggered by
  tags, GitHub releases, or a manually approved workflow.
- First release scope: confirm before Phase 8 that `@tekfoundry/aix` is the npm
  package target and that the package owner has permission to publish it.

## Risks

- Drift protection can create false confidence if hashes omit files, normalize
  paths inconsistently, or ignore deleted files.
- Git cache behavior can become a source of stale reads if ref resolution and
  fetch rules are unclear.
- Keeping both a Git cache and `.agents/packages` can confuse update behavior
  if the boundary between remote cache and project-local package store is not
  explicit.
- Alias front matter rewrites can corrupt `SKILL.md` if the front matter parser
  is too loose. Prefer alias wrappers over mutating fetched package content.
- Atomic lockfile writes need careful temp-file placement so cross-device
  renames do not fail.
- Targeted activation behavior can surprise users if the command silently edits
  the manifest. Decide this before implementation.
- Source removal can surprise users if it recursively deletes materialized
  package contents. MVP `aix remove skills` should refuse while active skills
  depend on the source, then remove only the source intent, metadata, and empty
  top-level package source directory.
- Deactivation can surprise users if it removes cached package content. MVP
  `aix deactivate skill` should remove the active entry only and preserve the
  package copy unless a later cleanup command owns pruning.
- Default external sources require network access in normal use. Tests should
  rely on local fixture repositories so verification stays deterministic.
- Publishing can leak credentials or publish the wrong package if CI secrets,
  package name, or access settings are wrong.
- Automated versioning can produce confusing releases if changelog entries and
  version bumps are not tied to reviewed changes.
- npm package contents can accidentally include local-only files if the package
  files allowlist is too broad.
- Workflow installation can break the agent process if workflow docs and
  workflow-owned skills are updated independently. Keep them packaged together
  and lock them as one active workflow.
- Allowing direct deactivation of workflow-owned skills would leave a workflow
  half-installed. Block direct removal and make workflow removal own that
  lifecycle.
- Workflow install can overwrite important local process guidance if drift
  checks are incomplete. Check `.agents` workflow docs and workflow-owned
  skills before every install, update, or remove.
- Workflow install should create missing `_docs` directories but must not treat
  project-owned `_docs` documents as package-managed files.
- Root `AGENTS.md` is mixed ownership after workflow install. Bad marker
  handling could overwrite repo-specific instructions or leave duplicated
  workflow blocks. Use marker-delimited updates, hash the managed block, and
  preserve all content outside the managed block.

## Lessons To Carry Forward

- Treat lockfile writes, package writes, and active skill changes as
  safety-sensitive.
- Keep default skills project-agnostic.
- Keep source discovery read-only.
- Keep source fetching separate from activation so network failures do not
  happen during active skill changes.
- Keep the MVP small enough that users can trust the tool before adding richer
  source types or automation.
- Treat workflows differently from skill catalogs. A workflow is an installed
  process, not a source to browse one file at a time.
- Keep workflow-local skills self-contained until there is a proven need for
  external workflow skill dependencies.
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
- workflow package layout, install/update/diff/remove semantics, and
  workflow-owned skill safeguards
- CLI output and exit-code conventions
- release workflow, versioning rules, publish trigger, and npm package access
  requirements
