# System Architecture

## Runtime Shape

AIX is a TypeScript-on-Node CLI. The executable `bin/aix.js` launches compiled
CLI code from `dist/`, while source modules live under `src/`.

```text
bin/aix.js
  -> dist/cli.js
      -> src/cli/index.ts
          -> src/cli/registry.ts
              -> src/cli/cmds/*
                  -> domain modules under src/
```

The runtime is single-process and filesystem-oriented. There is no daemon,
background worker, database, service account, or long-running server in the
current architecture. Each command reads the current workspace, performs
preflight checks, mutates files when authorized, and returns a structured
`CliResult` for rendering.

## Command Dispatch

`src/cli/index.ts` owns command dispatch:

1. Parse the first argument as the command name.
2. Render splash/help when no command or help is requested.
3. Resolve the command from `src/cli/registry.ts`.
4. Run either the command's synchronous `run` handler or its optional
   `runInteractive` handler.
5. Convert thrown errors to CLI exit codes and stderr through `toCliError`.

Command modules under `src/cli/cmds/` are intentionally thin. They validate
command arity, call domain functions, and render human-readable output. They do
not own package safety, lockfile writes, source resolution, or drift logic.

```text
CLI command module
  -> parse command arguments
  -> call domain module
  -> render result

domain module
  -> read manifest / lockfile / source
  -> preflight safety checks
  -> mutate filesystem when allowed
  -> write manifest / lockfile atomically
  -> return domain result
```

## Module Map

- `src/cli/`: command registry, command dispatch, usage, interactive prompts,
  pending-operation helpers, and CLI error mapping.
- `src/manifest/`: `aix.json` parsing, source parsing, request parsing,
  manifest IO, and manifest-specific errors.
- `src/lockfile/`: `aix.lock.json` parsing, IO, drift comparison, and
  lockfile-specific errors.
- `src/sources/`: default sources, source input normalization, Git cache
  resolution, source metadata, source management, and source removal.
- `src/skills/`: skill discovery, front matter name extraction, listing,
  rendering, and skill-domain types.
- `src/activation/`: standalone skill package materialization, active exposure,
  inferred dependencies, diff, update, deactivate, naming, manifest updates,
  lockfile updates, and verification.
- `src/roles/`: role front matter parsing, discovery, activation, delegation,
  rendering, lockfile handling, validation, listing, diff, update, deactivate,
  and verification.
- `src/workflows/`: workflow manifest parsing, install, update, diff, remove,
  source routing, staged packages, docs, managed `AGENTS.md`, workflow-owned
  skills, workflow-owned roles, templates, and verification.
- `src/init/`: default project initialization, default workflow installation,
  default standalone skill activation, and init output rendering.
- `src/status/`: read-only aggregation across manifest, lockfile,
  verification, diff/update status, active workflow, skills, roles, and
  sources.
- `src/fs/`, `src/paths/`, `src/ui/`, and `src/validation/`: shared
  filesystem, path, terminal output, selection prompt, and type guard
  primitives.

Top-level files such as `src/activation.ts`, `src/roles.ts`, `src/manifest.ts`,
and `src/lockfile.ts` re-export module APIs for command handlers and tests.

## Core Data Stores

```text
aix.json
  user intent:
    configured sources
    one requested workflow
    requested standalone skills
    requested standalone roles

aix.lock.json
  accepted resolved state:
    resolved Git commits
    package paths
    active paths
    aliases
    ownership
    dependency edges
    file hashes

.agents/packages/
  package-managed copies:
    skills/
    roles/
    workflows/

.agents/skills/
  agent-facing active skill directories

.agents/roles/
  agent-facing active role Markdown files

.agents/templates/
  project-owned workflow template overrides

_docs/
  project-owned documentation and plan state
```

## Ownership Boundaries

- CLI modules own argument shape and output rendering.
- Domain modules own source resolution, preflight checks, lockfile changes, and
  filesystem mutation.
- Shared schema and path modules own stable cross-module contracts.
- Package-managed files live under `.agents/` and are hash-checked against the
  lockfile.
- Project-owned docs live under `_docs/` and are not routine workflow-update
  targets.
- Workflow-owned skills and roles are lockfile entries owned by the active
  workflow, not standalone user requests.
- Published templates under `.agents/templates/` are project-owned overrides,
  not package-managed workflow-origin files.

## Architectural Invariants

- One workflow may be active at a time.
- Mutating commands must preflight local drift before replacing or removing
  package-managed files.
- `aix.json` records user intent; `aix.lock.json` records accepted resolved
  state.
- File hashes in the lockfile are the source of truth for package drift,
  active drift, workflow doc drift, template drift, and managed `AGENTS.md`
  drift.
- Direct standalone commands cannot deactivate workflow-owned skills or roles.
- Role metadata can hint at useful skills, but it does not trigger automatic
  skill installation.
- Missing lockfiles parse as empty v1 lockfiles, but successful mutations write
  the exact resolved state before considering work complete.
- Local `./aix/...` sources take precedence for supported bundled workflow,
  skill, and role paths when the local path exists.

## Extension Points

- New CLI behavior is added as command modules registered in
  `src/cli/registry.ts`.
- New package kinds would require schema, lockfile, path, verification, source,
  and lifecycle support.
- New source types would require `SourceDefinition` and resolver changes; the
  current implementation supports Git-backed sources and local source paths
  represented as `sourceType: "local"` in the lockfile.
- New workflows are installable when they provide a valid `workflow.json`,
  declared docs, optional skills, optional roles, and optional templates.
- New bundled roles can be added under the AIX role source, but active role
  files must still satisfy role validation and lockfile hashing.

## Maintainability Tradeoffs

- Command modules are thin, which keeps user-facing output separate from
  package-management rules.
- Skill activation, role activation, and workflow activation share concepts but
  remain separate modules because their package shapes differ.
- Workflow-owned assets are stored as normal lockfile entries with owner
  metadata. This makes verification and status reusable, but requires
  standalone commands to filter out owned entries.
- Templates are deliberately not rendered by AIX at install time. AIX packages,
  publishes, diffs, and resets templates; workflow skills own how templates are
  applied.
