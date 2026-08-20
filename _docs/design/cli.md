# CLI Design

## Command Name

The CLI command should be `aix`.

This keeps the daily command surface small:

```bash
aix add
aix install
aix activate
aix remove
aix deactivate
aix update
aix diff
aix verify
```

The name also leaves room for the tool to grow beyond direct skill installation
later, while still matching the current `.agents/` ownership model.

## Distribution

The project should publish under a scoped package name instead of depending on
the unscoped npm package name.

The recommended distribution path is a scoped npm package that installs an
`aix` binary:

```bash
npm install -g @tekfoundry/aix
```

Users would then run:

```bash
aix init
```

The package name can be explicit and namespaced while the executable remains
short and pleasant to use.

The package metadata should keep the published package name scoped as
`@tekfoundry/aix`, expose the binary through `"bin": { "aix": "./bin/aix.js" }`,
and set `"publishConfig": { "access": "public" }` so npm publishes the scoped
package publicly when the release workflow reaches the publish step.

## MVP Commands

The first implementation should focus on:

```bash
aix init
aix install workflow <git-or-github-tree-url> [alias]
aix remove workflow
aix add skills <git-or-github-tree-url> [alias]
aix remove skills <source-name>
aix activate skill [source/path] [alias]
aix deactivate skill <active-name>
aix update
aix update workflow
aix diff
aix diff workflow
aix verify
aix list
aix list skills [source]
```

Later commands can include:

```bash
aix outdated
aix prune
aix replace workflow <git-or-github-tree-url> [alias]
```

`aix install workflow <git-or-github-tree-url> [alias]` should install one
Git-backed workflow as the project's active AI Agent Workflow. Workflow install
normalizes GitHub tree URLs, fetches the source into the shared Git cache,
reads `workflow.json`, copies recognized workflow docs into `.agents/`, inserts
or updates the workflow-managed block in root `AGENTS.md`, activates
workflow-local skills, scaffolds missing `_docs` directories, and writes
workflow docs, the managed `AGENTS.md` block, and workflow-owned skill hashes
to `aix.lock.json`.

Workflows are all-or-nothing for the MVP. Only one workflow may be active at a
time. Installing a second workflow should fail until a later explicit replace
flow owns that behavior.

Workflow-local skills are owned by the workflow, not by user-requested root
skill activation. `aix deactivate skill <active-name>` should refuse to remove
a workflow-owned skill and tell the user to remove or replace the workflow
instead.

`aix remove workflow` should remove the active workflow docs and workflow-owned
skills only after local drift checks pass. It should remove only the managed
workflow block from root `AGENTS.md` and leave project-owned `AGENTS.md` and
`_docs` content in place.

`aix diff workflow` should compare locked workflow docs and workflow-owned
skill package copies with the currently resolved workflow source without
changing files.

`aix update workflow` should refresh the locked workflow docs and workflow-owned
skills, including the managed `AGENTS.md` block, only after local drift checks
pass.

`aix add skills <git-or-github-tree-url> [alias]` should add a Git-backed skill
source to `aix.json` under `sources.skills`, resolve the requested ref,
discover skill folders under the configured path, and prefetch source metadata
into the shared Git cache. The optional alias sets the local source name.
Without an alias, AI Extensions derives a readable source name from the URL and
source path. GitHub tree URLs
such as
`https://github.com/mattpocock/skills/tree/main/skills` should be normalized
into a Git URL, ref, and source path. Source addition should not copy every
discovered skill into `.agents/packages` by default; activation materializes
only the requested skill package into the project.

The command uses the plural `skills` because it adds a source collection. This
keeps future kinds open without flags, for example `aix add agents <url>`.

`aix remove skills <source-name>` should remove a configured skill source only
when no active skills still depend on it. If any active skills depend on the
source, it should fail and tell the user to deactivate those skills first. When
safe, it should remove the source entry, matching source metadata, and the
empty top-level `.agents/packages/skills/<source-name>` directory. It should
not recursively delete package contents.

`aix remove skills` without a source name should provide an interactive picker
over configured skill sources in `aix.json`. The picker should show an
enumerated source list, include `q - Quit` directly after the selectable
options, and remove the selected source through the same safety checks as the
explicit command. Sources that cannot be removed yet should appear in a final
section headed `To remove the following sources deactivate their skills first:`.

`aix activate skill <source>/<path> [alias]` should expose one materialized
skill through `.agents/skills/<active-name>`. Without an alias, the active name
is the skill's front matter `name`, and activation can usually be a symlink to
the materialized package skill folder. With an alias, the active name is the
alias. If the agent runtime requires `SKILL.md` front matter `name:` to match
the active name, aliased activation may need a small managed wrapper directory
instead of a direct symlink so the package copy remains unchanged. Activation
should add only the user-selected root skill to `aix.json`; inferred dependency
skills are activated and locked but remain dependency-only entries in
`aix.lock.json`. If a package directory already exists for the requested skill
and is not safely accounted for by the lockfile or the resolved source content,
activation should stop instead of overwriting it.

`aix activate` without a kind provides an interactive kind picker with `Skills`
and `q - Quit`. Choosing `Skills` opens the skill activation flow.
`aix activate skill` without a target lists configured skill sources, lets the
user select a source by number, lists skills from that source, and lets the
user select a skill by number.

`aix deactivate` without a kind provides an interactive kind picker with
`Skills` and `q - Quit`. Choosing `Skills` opens the skill deactivation flow.
`aix deactivate skill` without a target lists only user-requested root active
skills and lets the user select one by number. Dependency-only active skills
are omitted from the picker because root deactivation owns dependency cleanup.
`aix deactivate skill <active-name>` undoes activation for one active skill. It
removes the active entry from
`.agents/skills`, removes package copies that are no longer needed when their
files still match the lockfile hashes, removes empty package parent directories
below `.agents/packages/skills`, and updates the manifest/lockfile state.
When the selected skill is a user-requested root, deactivation also removes
orphaned dependency-only active skills that are no longer required by remaining
root skills. Directly selecting a dependency-only skill that another active
skill still depends on fails with an actionable error. If active or package
files have local edits, deactivation should fail before removing anything.

`aix list` without a kind should provide an interactive picker with `Skills` as
the first option and `q - Quit`, leaving room for later kinds such as `agents`.

`aix list skills` should provide an interactive picker over skill sources and
then list discoverable skills from the selected source. `aix list skills
<source>` should list discoverable skills from a configured source without
prompting. This is especially important for default external sources such as
`mattpocock` and `cursor-pstack`, which should be browseable before the user
chooses specific skills to activate.

`aix init` should initialize a project-local AI Extensions environment. It
creates the expected local files, installs the default `aix` workflow, adds the
default external skill sources, fetches source metadata, materializes default
workflow content, and activates the default workflow-owned skills so the
project can start using AI Extensions immediately.

Running `aix` with no arguments should print a minimal splash screen with the
product name, package version, and current or planned command list. It should
exit successfully.

## Terminal UX

Command output should feel close to everyday developer tools such as npm and
Composer: readable in plain text, pleasant in a real terminal, and predictable
when piped or captured by tests.

Interactive menus should use a shared terminal UI wrapper instead of formatting
menus inside command modules. The wrapper may use established prompt and color
packages internally, but command code should depend on project-level concepts
such as a selection menu, table, status message, or prompt result.

The MVP should use lightweight terminal UX dependencies rather than a full
terminal app framework. `@inquirer/prompts` is the preferred prompt layer
because it supports injected input and output streams for tests while giving
real terminal users a more polished selection experience. `yoctocolors` is the
preferred color layer. Ink remains a good future option if AI Extensions grows
into persistent interactive screens, live progress dashboards, or multi-panel
review flows.

Non-interactive output should remain stable and scriptable. Tables should use
plain aligned text by default, with color only when writing to a TTY.

## Exit Codes

The CLI uses structured errors with explicit exit codes:

- `0` for successful commands such as help output
- `1` for command-line usage errors, including unknown commands
- `2` for runtime command failures

Until each MVP command is implemented, recognized commands fail through the
runtime error path with a non-zero exit code.
