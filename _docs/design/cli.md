# CLI Design

## Command Name

The CLI command should be `aix`.

This keeps the daily command surface small:

```bash
aix init
aix verify
aix status
aix workflow install
aix workflow update
aix update
aix templates list
aix templates publish
aix roles add
aix roles list
aix roles diff
aix roles update
aix roles remove
aix role activate
aix role diff
aix role update
aix role deactivate
aix skills add
aix skills list
aix skills list --missing-only
aix skills diff
aix skill activate
aix skill deactivate
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
aix verify
aix status
aix workflow install [git-or-github-tree-url] [alias]
aix workflow uninstall
aix skills add <git-or-github-tree-url> [alias]
aix skills remove <source-name>
aix skills list [source]
aix skill activate [source/path] [alias]
aix skill deactivate <active-name>
aix skills update
aix skills update <source>/<path>
aix workflow update
aix skills diff
aix skills diff <source>/<path>
aix workflow diff
aix templates list
aix templates publish
aix templates diff
aix templates diff <template-name>
aix templates reset <template-name>
aix templates reset --all
aix roles add <git-or-github-tree-url> [alias]
aix roles remove <source-name>
aix roles list [source]
aix role activate <source>/<role-path> [alias]
aix role deactivate <active-name>
aix roles update
aix roles update <active-name>
aix role update <active-name>
aix roles diff
aix roles diff <active-name>
aix role diff <active-name>
```

Later commands can include:

```bash
aix outdated
aix prune
aix workflow replace <git-or-github-tree-url> [alias]
```

`aix workflow install [git-or-github-tree-url] [alias]` should install one
Git-backed workflow as the project's active AI Agent Workflow. Without a URL,
the command should list bundled workflows from `aix/workflows` and let the user
pick one. With a URL, workflow install normalizes the GitHub tree URL, fetches
the source into the shared Git cache, reads `workflow.json`, copies recognized
workflow docs into `.agents/`, inserts or updates the workflow-managed block in
root `AGENTS.md`, activates workflow-local skills, scaffolds missing `_docs`
directories, and writes workflow docs, the managed `AGENTS.md` block, and
workflow-owned skill hashes to `aix.lock.json`.

Workflows are all-or-nothing for the MVP. Only one workflow may be active at a
time. Installing a second workflow should fail and tell the user to run
`aix workflow uninstall` before installing the next workflow.

Workflow-local skills are owned by the workflow, not by user-requested root
skill activation. `aix skill deactivate <active-name>` should refuse to remove
a workflow-owned skill and tell the user to uninstall or replace the workflow
instead.

Role commands mirror the skills command shape. `aix roles add
<git-or-github-tree-url> [alias]` adds a Git-backed role source under
`sources.roles`, discovers Markdown role files, and writes role source metadata
without activating roles or writing `.agents/roles`. `aix roles list [source]`
lists discoverable role files from a configured role source and includes
copy/pasteable `aix role activate <source>/<role-path>` commands.

`aix role activate <source>/<role-path> [alias]` materializes one standalone
role under `.agents/packages/roles/<source>/...`, exposes it through
`.agents/roles/<active-name>.md`, preserves package front matter, rewrites only
the active role name when an alias is requested, records top-level `roles`
intent in `aix.json`, and records package and active hashes in
`aix.lock.json`. When activating from the default `aix` source, targets under
`aix/roles/...` prefer editable local `./aix/roles/...` files before falling
back to the configured or bundled remote source.

`aix roles diff`, `aix roles update`, `aix role diff <active-name|source/path>`,
and `aix role update <active-name|source/path>` compare and refresh standalone
roles only. They refuse workflow-owned roles and refuse package or active-file
drift before writing. `aix role deactivate <active-name>` removes user-owned
standalone role exposure, package materialization, manifest intent, and
lockfile state after drift checks pass. Workflow-owned roles remain owned by
workflow install, update, diff, and uninstall.

Role-owned skills are managed as part of the owning role lifecycle rather than
as independently removable root skills. `aix skill deactivate` refuses a skill
whose lockfile owner is a role and tells the user to deactivate or update the
owning role. This preserves all-or-nothing role package behavior. Role
`skills` metadata remains a delegation hint until a future package format
defines bundled role-owned skills.

`aix workflow uninstall` should remove the active workflow docs and workflow-owned
skills only after local drift checks pass. It should remove only the managed
workflow block from root `AGENTS.md` and leave project-owned `AGENTS.md` and
`_docs` content in place.

`aix workflow diff` should compare locked workflow docs and workflow-owned
skill package copies with the currently resolved workflow source without
changing files.

`aix workflow update` should refresh the locked workflow docs and workflow-owned
skills, including the managed `AGENTS.md` block, only after local drift checks
pass.

`aix templates list` should list templates from the active workflow and show
whether each one is using the workflow origin or a published local override.

`aix templates publish` should publish the complete active workflow template
set into `.agents/templates/`. It should copy document templates to the top
level, copy section templates under `.agents/templates/sections/`, and refuse a
targeted `publish <template-name>` form. Publishing must refuse to overwrite a
published template that has local edits.

`aix templates diff` should compare all published local templates with their
active workflow origins. `aix templates diff <template-name>` should compare
one published template, including section names such as `sections/verification`.
Templates without a published override have no local diff.

`aix templates reset <template-name>` should delete one published local
override after validating that the name belongs to the active workflow template
set. Reset should not copy origin content over the published file. After reset,
normal template resolution falls back to the workflow origin.

`aix templates reset --all` should delete every published local override that
belongs to the active workflow template set. It should leave package-managed
workflow origin templates untouched, preserve unrelated files under
`.agents/templates/`, remove empty template directories when possible, and
return the project to workflow-origin template resolution.

`aix skills add <git-or-github-tree-url> [alias]` should add a Git-backed skill
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
keeps future kinds open without flags, for example `aix agents add <url>`.

`aix skills remove <source-name>` should remove a configured skill source only
when no active skills still depend on it. If any active skills depend on the
source, it should fail and tell the user to deactivate those skills first. When
safe, it should remove the source entry, matching source metadata, and the
empty top-level `.agents/packages/skills/<source-name>` directory. It should
not recursively delete package contents.

`aix skills remove` without a source name should provide an interactive picker
over configured skill sources in `aix.json`. The picker should show an
enumerated source list, include `q - Quit` directly after the selectable
options, and remove the selected source through the same safety checks as the
explicit command. Sources that cannot be removed yet should appear in a final
section headed `To remove the following sources deactivate their skills first:`.

`aix skill activate <source>/<path> [alias]` should expose one materialized
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

`aix skill activate` without a target lists configured skill sources, lets the
user select a source by number, lists skills from that source, and lets the
user select a skill by number.

`aix skill deactivate` without a target lists only user-requested root active
skills and lets the user select one by number. Dependency-only active skills
are omitted from the picker because root deactivation owns dependency cleanup.
`aix skill deactivate <active-name>` undoes activation for one active skill. It
removes the active entry from
`.agents/skills`, removes package copies that are no longer needed when their
files still match the lockfile hashes, removes empty package parent directories
below `.agents/packages/skills`, and updates the manifest/lockfile state.
When the selected skill is a user-requested root, deactivation also removes
orphaned dependency-only active skills that are no longer required by remaining
root skills. Directly selecting a dependency-only skill that another active
skill still depends on fails with an actionable error. If active or package
files have local edits, deactivation should fail before removing anything.

`aix skills list` should provide an interactive picker over skill sources and
then list discoverable skills from the selected source. `aix skills list
<source>` should list discoverable skills from a configured source without
prompting. This is especially important for default external sources such as
`mattpocock` and `cursor-pstack`, which should be browseable before the user
chooses specific skills to activate. List output includes a copy/pasteable
install command for each row. `aix skills list <source> --missing-only` filters
the output to skills that are not already locked locally. When listing the
default `aix` source, the command includes standalone skills from `aix/skills`
and, when an `aix` workflow is installed, workflow-owned skills from that
installed workflow source. Missing standalone skills use `aix skill activate`
as their install command. Missing workflow-owned skills use
`aix workflow update`.

`aix update` is the canonical whole-workspace update command. It composes the
existing update commands in order by running the same behavior as
`aix workflow update`, `aix skills update`, and `aix roles update`; it should
not duplicate the workflow, skill, or role update implementation. After update
steps succeed, it
prints the same missing-skills output as `aix skills list aix --missing-only`.

Whole-workspace lifecycle commands are intentionally top-level. `aix init`,
`aix verify`, and `aix status` are not compatibility aliases for an old syntax;
they are the canonical commands for actions that apply to the current
workspace as a whole. Asset-specific commands keep the object-first grammar,
such as `aix workflow install`, `aix skills add`, and `aix skill activate`.

`aix init` should initialize a project-local AI Extensions environment. It
creates the expected local files, installs the default `aix` workflow, adds the
default external skill sources, fetches source metadata, materializes default
workflow content, and activates the default workflow-owned skills so the
project can start using AI Extensions immediately.

`aix verify` should check whether the manifest, lockfile, package files, active
files, workflow docs, managed `AGENTS.md` block, hashes, skill front matter,
owner metadata, and naming rules agree. It should stay check-focused and return
a non-zero exit code when the installed state is invalid or locally drifted.

`aix status` should provide a clean read-only summary of the current AI
Extensions workspace. It should show whether the workspace is initialized, the
active workflow if present, configured workflow and skill sources, active
user-requested skills, dependency-only active skills, workflow-owned skills,
local drift or verification issues, and update availability when it can be
determined. Status output should be human-scannable first, with clear section
headings and compact tables rather than raw JSON.

Out-of-date detection in `aix status` may require resolving remote Git refs.
The MVP should keep status read-only, but it may fetch source metadata or refs
when needed to compare locked commits with currently resolved source commits.
If network access or ref resolution fails, status should still report local
installed state and show the update check as unavailable rather than treating
the whole status command as failed.

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
