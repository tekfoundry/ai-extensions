# Package Management Design

## Manifest And Lockfile

Projects declare desired skills in `ai-skills.json`.

ASM may provide built-in default source definitions so projects can discover
known skill collections before adding explicit manifest entries.

Resolved installs are recorded in `ai-skills.lock.json`, including:

- source name and Git URL
- requested ref
- resolved commit SHA
- source path
- install path
- original skill name
- installed skill name
- alias metadata when applicable
- installed file hashes

The manifest represents intent. The lockfile represents the exact installed
state.

## Source Discovery

Default external sources should be discoverable without automatic installation.

`asm list <source>` should resolve the source, inspect its configured path, and
report valid skill folders. For flat sources, direct child folders containing
`SKILL.md` are skills. For nested sources, descendant folders containing
`SKILL.md` are skills and should be reported by their source-relative path.

Discovery must not modify `ai-skills.json`, `ai-skills.lock.json`, or
`.agents/skills`.

## Install Flow

An install should:

1. Read and validate `ai-skills.json`.
2. Resolve each Git source and requested ref.
3. Locate each requested skill folder.
4. Validate `SKILL.md` front matter.
5. Determine the installed name from alias or natural skill name.
6. Detect install-name collisions before copying files.
7. Check local files against lockfile hashes.
8. Refuse to overwrite local edits.
9. Copy skill files into `.agents/skills/<installed-name>`.
10. Rewrite front matter `name:` when an alias is used.
11. Hash installed files.
12. Write `ai-skills.lock.json` atomically.

## Local Drift Protection

The tool must never silently overwrite local edits.

If a local installed file differs from the checksum in the lockfile, install or
update should stop with an actionable error.

The MVP should not attempt automatic merges.

## Skill Naming

Skills install with their natural name by default:

```text
cursor-pstack/tdd -> .agents/skills/tdd
```

If two skills want the same installed name, installation fails and asks the user
to add an alias.

When an alias is provided:

- the alias must be unique
- the alias must be a valid folder name
- installed `SKILL.md` front matter `name:` should match the alias
- the lockfile records the original name and installed name
