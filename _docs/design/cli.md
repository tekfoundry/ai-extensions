# CLI Design

## Command Name

The CLI command should be `aix`.

This keeps the daily command surface small:

```bash
aix add
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

## MVP Commands

The first implementation should focus on:

```bash
aix init
aix add skills <git-or-github-tree-url> [alias]
aix remove skills <source-name>
aix activate skill [source/path] [alias]
aix deactivate skill <active-name>
aix update
aix diff
aix verify
aix list
aix list skills [source]
```

Later commands can include:

```bash
aix outdated
aix prune
```

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
instead of a direct symlink so the package copy remains unchanged.

`aix activate skill` without a target should later provide an interactive flow:
list configured skill sources, let the user select a source by number, list
inactive skills from that source, and let the user select a skill by number.
The MVP may implement non-interactive activation first if terminal prompts add
too much test or runtime complexity.

`aix deactivate skill <active-name>` should undo activation for one active
skill. It removes the active entry from `.agents/skills` and updates the
manifest/lockfile state without deleting the materialized package copy unless a
later cleanup command owns package pruning.

`aix list` without a kind should provide an interactive picker with `skills` as
the first option and `q - Quit`, leaving room for later kinds such as `agents`.

`aix list skills` should provide an interactive picker over skill sources and
then list discoverable skills from the selected source. `aix list skills
<source>` should list discoverable skills from a configured source without
prompting. This is especially important for default external sources such as
`mattpocock` and `cursor-pstack`, which should be browseable before the user
chooses specific skills to activate.

`aix init` should initialize a project-local AI Extensions environment. It
creates the expected local files, adds the default sources, fetches the default
source metadata, materializes the default package content, and activates the
default local workflow skills so the project can start using AI Extensions
immediately.

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
