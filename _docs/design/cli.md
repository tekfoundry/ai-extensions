# CLI Design

## Command Name

The CLI command should be `aix`.

This keeps the daily command surface small:

```bash
aix install
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
aix install
```

The package name can be explicit and namespaced while the executable remains
short and pleasant to use.

## MVP Commands

The first implementation should focus on:

```bash
aix init
aix install
aix update
aix diff
aix verify
aix list <source>
```

Later commands can include:

```bash
aix add <source>/<path>
aix remove <source>/<path>
aix outdated
```

`aix list <source>` should list discoverable skills from a configured source
without installing them. This is especially important for default external
sources such as `mattpocock` and `cursor-pstack`, which should be browseable
before the user chooses specific skills to install.

`aix init` should initialize a project-local AI Extensions environment. It
creates the expected local files and installs the default local workflow skills
so the project can start using AI Extensions immediately.

Running `aix` with no arguments should print a minimal splash screen with the
product name, package version, and current or planned command list. It should
exit successfully.

## Exit Codes

The CLI uses structured errors with explicit exit codes:

- `0` for successful commands such as help output
- `1` for command-line usage errors, including unknown commands
- `2` for runtime command failures

Until each MVP command is implemented, recognized commands fail through the
runtime error path with a non-zero exit code.
