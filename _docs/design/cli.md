# CLI Design

## Command Name

The CLI command should be `asm`, short for Agent Skills Manager.

This keeps the daily command surface small:

```bash
asm install
asm update
asm diff
asm verify
```

The name also leaves room for the tool to grow beyond direct skill installation
later, while still matching the current `.agents/` ownership model.

## Distribution

The unscoped npm package name `asm` is already taken, so the project should not
assume it can publish there.

The recommended distribution path is a scoped npm package that installs an
`asm` binary:

```bash
npm install -g @tekfoundry/asm
```

Users would then run:

```bash
asm install
```

The package name can be explicit and namespaced while the executable remains
short and pleasant to use.

## MVP Commands

The first implementation should focus on:

```bash
asm install
asm update
asm diff
asm verify
asm list <source>
```

Later commands can include:

```bash
asm add <source>/<path>
asm remove <source>/<path>
asm outdated
```

`asm list <source>` should list discoverable skills from a configured source
without installing them. This is especially important for default external
sources such as `mattpocock` and `cursor-pstack`, which should be browseable
before the user chooses specific skills to install.
