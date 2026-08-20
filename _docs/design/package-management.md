# Package Management Design

## Manifest And Lockfile

Projects declare desired extensions in `aix.json`.

AI Extensions may provide built-in default source definitions so projects can
discover known skill collections before adding explicit manifest entries.

Resolved installs are recorded in `aix.lock.json`, including:

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

The initial manifest schema is:

```json
{
  "sources": {
    "source-name": {
      "type": "git",
      "url": "https://example.com/skills.git",
      "path": "skills",
      "ref": "main"
    }
  },
  "skills": [
    "source-name:path/to/skill"
  ]
}
```

`sources` is optional. Source entries currently support Git sources only.
Each source requires a `url`. `path` and `ref` are optional non-empty strings
when present.

Skill entries should use compact `source:path` strings by default. Use object
entries only when the skill needs metadata such as an alias or skill-level ref:

```json
{
  "skills": [
    "aix:project-init",
    {
      "source": "cursor-pstack",
      "path": "tdd",
      "alias": "cursor-tdd"
    }
  ]
}
```

The initial lockfile schema is versioned:

```json
{
  "lockfileVersion": 1,
  "skills": [
    {
      "source": "source-name",
      "sourceType": "git",
      "sourceUrl": "https://example.com/skills.git",
      "requestedRef": "main",
      "resolvedCommit": "commit-sha",
      "sourcePath": "path/to/skill",
      "installPath": ".agents/skills/installed-name",
      "originalName": "natural-name",
      "installedName": "installed-name",
      "alias": "optional-installed-name",
      "files": [
        {
          "path": "SKILL.md",
          "sha256": "file-hash"
        }
      ]
    }
  ]
}
```

Missing lockfiles load as an empty v1 lockfile. Lockfile writes use a
same-directory temporary file followed by rename so replacement is atomic on
the target filesystem.

## Source Discovery

Default external sources should be discoverable without automatic installation.

`aix list <source>` should resolve the source, inspect its configured path, and
report valid skill folders. For flat sources, direct child folders containing
`SKILL.md` are skills. For nested sources, descendant folders containing
`SKILL.md` are skills and should be reported by their source-relative path.
List output uses one skill per line:

```text
source-relative/path<TAB>skill-name
```

Discovery must not modify `aix.json`, `aix.lock.json`, or
`.agents/skills`.

Git sources are cloned or fetched into a deterministic cache outside the
project by default. The default cache root is the operating system temp
directory under `aix-cache`; tests and callers can override it with
`AIX_CACHE_DIR`. Source cache directory names are derived from source names
using only filesystem-safe characters. Git refs resolve to exact commit SHAs
before discovery reads source files.

Default verification should use local fixture Git repositories so normal test
runs stay deterministic and offline-friendly. Tests that reach public remote
Git repositories are allowed as opt-in integration checks, gated outside the
default suite, so they can validate real source behavior without making every
local or CI run depend on network availability.

## Init Flow

`aix init` should initialize a project-local AI Extensions environment.

An init should:

1. Create `.agents/` and `.agents/skills/` when missing.
2. Create `aix.json` when missing.
3. Write initial source definitions for `aix`, `mattpocock`, and
   `cursor-pstack`.
4. Resolve the `aix` Git source and declare every skill under its configured
   `aix/skills` path using compact `source:path` entries.
5. Declare and install `cursor-pstack/unslop` from the `cursor-pstack` source.
6. Install all declared default skills into `.agents/skills`.
7. Write `aix.lock.json` with the resulting installed file hashes.

Init must not overwrite local edits silently. If `.agents/skills`, `aix.json`,
or `aix.lock.json` already exist, init should validate the current state and
stop with an actionable error before changing files when it cannot prove the
write is safe.

## Install Flow

An install should:

1. Read and validate `aix.json`.
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
12. Write `aix.lock.json` atomically.

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
