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
- commands for `add skills`, `remove skills`, `activate skill`,
  `deactivate skill`, `update`, `diff`, `verify`, and `list skills [source]`
- initialization through `aix init`
- Git-based skill sources only
- project manifests in `aix.json`
- exact fetched and active state in `aix.lock.json`
- source metadata fetched into the shared Git cache
- active skill packages materialized under `.agents/packages/skills/<source>/...`
- active skills exposed through `.agents/skills/<active-name>`
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
package exposes an `aix` CLI that adds and removes skill sources, activates and
deactivates skills, updates, diffs, and verifies AI-agent skills from Git-based
sources. It protects local edits and records exact resolved state.

The release should let a project manage skills the way it manages other local
dependencies. A project declares sources and active skills, fetches source
metadata into the shared Git cache, materializes active skill package copies
under `.agents/packages/skills`, exposes selected skills through
`.agents/skills`, reviews changes before accepting updates, and can trust that
AI Extensions will not overwrite modified local files without warning.

The MVP is not complete until the team can publish a new package version
through a documented repeatable path.

## Design Intent (status: accepted)

Build the MVP as a TypeScript CLI on Node.js. Keep the modules small and
explicit while the product rules are still settling.

The CLI should expose these commands:

- `aix init`
- `aix add skills <git-or-github-tree-url> [alias]`
- `aix remove skills <source-name>`
- `aix activate skill [source/path] [alias]`
- `aix deactivate skill <active-name>`
- `aix update`
- `aix update <source>/<path>`
- `aix diff`
- `aix diff <source>/<path>`
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
`cursor-pstack`; fetches default source metadata; materializes the package
content needed by defaults; activates the default skills from the remote `aix`
source path `aix/skills`; and activates `cursor-pstack/unslop` from the
`cursor-pstack` source.

`aix.json` should declare common skill dependencies as compact `source:path`
strings. Object entries are reserved for aliases, per-skill refs, or later
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
`aix.json`, `aix.lock.json`, `.agents/packages`, and `.agents/skills` unless a
command explicitly initializes missing documentation folders. The MVP does not add
registry support, plugin package support, dependency resolution, global
installs, or per-tool compatibility symlink management beyond keeping
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
- `aix/skills/` is the canonical workflow skill source path inside the remote
  `aix` Git source.
- `_docs/` is project-owned documentation.
- Source repositories are fetched into the shared Git cache.
- Active skill package copies live under `.agents/packages/skills/<source>/...`.
- Active skills live under `.agents/skills/<active-name>`.
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

### Phase 4: Activation, deactivation, and lockfile integrity (status: accepted)

Goal: materialize declared or requested skill packages, activate them into
`.agents/skills`, deactivate active skills when requested, and record exact
package plus activation lockfile state.

Tasks:

- ⬜️ Implement activation selection from declared manifest entries and targeted
      `aix activate skill <source>/<path> [alias]`.
- ⬜️ Decide before implementation whether no-argument `aix activate skill`
      ships with an interactive source/skill picker in the MVP or is explicitly
      deferred after non-interactive activation works.
- ⬜️ Locate requested source-relative skill paths.
- ⬜️ Determine active names from natural names or aliases.
- ⬜️ Validate aliases as safe folder names.
- ⬜️ Detect active-name collisions before changing `.agents/skills`.
- ⬜️ Create direct symlinks for non-aliased activation when safe.
- ⬜️ Create managed wrapper or materialized active directories for aliases when
      needed so `SKILL.md` front matter matches the alias.
- ⬜️ Hash package files and active skill files with SHA-256.
- ⬜️ Write lockfile entries with source URL, requested ref, resolved commit,
      package kind, source path, package path, activation path, original name,
      active name, alias metadata, and file hashes.
- ⬜️ Implement `aix deactivate skill <active-name>` with local-drift checks,
      manifest updates, lockfile updates, and package-copy preservation.
- ⬜️ Preserve package-managed and project-owned boundaries during activation.

Verification:

- unit tests for name resolution, alias validation, collision detection,
  symlink creation, alias wrapper creation, hashing, deactivation, and lockfile
  content
- command-level activation and deactivation tests using local fixture Git
  repositories
- interactive activation tests if the no-argument picker ships in the MVP
- `npm run typecheck`
- `npm test`

### Phase 5: Drift protection, update, diff, and verify (status: accepted)

Goal: make repeated use safe. AI Extensions should detect local edits, show
pending changes, and check fetched package plus active skill state.

Tasks:

- ⬜️ Implement lockfile hash comparison against package and active skill files.
- ⬜️ Fail activate, deactivate, and update when local drift is detected.
- ⬜️ Implement `aix update` for all locked skills.
- ⬜️ Implement targeted update filtering if the command shape is accepted.
- ⬜️ Implement `aix diff` against the currently resolved source version.
- ⬜️ Implement targeted diff filtering if the command shape is accepted.
- ⬜️ Implement `aix verify` for manifest, lockfile, package files, active
      files, hashes, skill front matter, aliases, and collision rules.
- ⬜️ Add actionable error messages for drift, missing package or active files,
      lockfile mismatch, unresolved sources, and invalid skills.

Verification:

- unit tests for drift detection and verification failures
- command-level tests for update, diff, verify, and targeted filters
- tests proving locally edited files are not overwritten
- `npm run typecheck`
- `npm test`

### Phase 6: Package readiness (status: accepted)

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

### Phase 7: Repeatable versioning and publishing (status: accepted)

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
- Activation declaration behavior: decide before Phase 4 whether
  `aix activate skill <source>/<path> [alias]` automatically records the active
  skill in `aix.json`, or whether it only activates skills already declared
  there.
- Interactive activation behavior: decide before Phase 4 whether
  no-argument `aix activate skill` ships as an MVP picker or is deferred until
  after the non-interactive workflow is complete.
- Git cache location: decide before Phase 2 whether the cache lives under a
  project-local path, an OS cache directory, or a temporary test-controlled
  location.
- Built-in `aix` source packaging: keep `aix/skills` as the source path inside
  `https://github.com/tekfoundry/ai-extensions.git` at ref `master`.
- Diff format: decide before Phase 5 whether MVP output is unified diff text,
  a structured summary, or both.
- Initialization behavior: decide before Phase 6 whether `aix activate skill`
  may scaffold missing `.agents` and `_docs` folders, or whether that belongs
  to a later explicit command.
- Release workflow: choose before Phase 7 whether to use Changesets,
  semantic-release, or a simpler npm-version workflow.
- Publish trigger: choose before Phase 7 whether releases are triggered by
  tags, GitHub releases, or a manually approved workflow.
- First release scope: confirm before Phase 7 that `@tekfoundry/aix` is the npm
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

## Lessons To Carry Forward

- Treat lockfile writes, package writes, and active skill changes as
  safety-sensitive.
- Keep default skills project-agnostic.
- Keep source discovery read-only.
- Keep source fetching separate from activation so network failures do not
  happen during active skill changes.
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
