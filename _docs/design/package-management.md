# Package Management Design

## Manifest And Lockfile

Projects declare desired extensions in `aix.json`.

AI Extensions may provide built-in default source definitions so projects can
discover known skill collections before adding explicit manifest entries.

Resolved source packages and active skills are recorded in `aix.lock.json`,
including:

- source name and Git URL
- package kind
- requested ref
- resolved commit SHA
- source path
- package path under `.agents/packages/skills`
- activation path under `.agents/skills` when active
- original skill name
- active skill name
- alias metadata when applicable
- package and active file hashes

The manifest represents intent. The lockfile represents the exact fetched and
active state.

The initial manifest schema is:

```json
{
  "sources": {
    "skills": {
      "source-name": "https://github.com/example/skills/tree/main/skills",
      "private-source": {
        "type": "git",
        "url": "git@github.com:example/private-skills.git",
        "path": "skills",
        "ref": "main"
      }
    }
  },
  "skills": [
    "source-name:path/to/skill"
  ]
}
```

`sources` is optional. `sources.skills` contains configured skill source
collections. GitHub tree URL strings are the preferred shorthand for public
GitHub sources. AI Extensions normalizes them into Git URL, ref, and source
path. Object entries remain available for SSH URLs, non-GitHub Git URLs, or
future metadata. Source entries currently support Git sources only. Object
entries require a `url`; `path` and `ref` are optional non-empty strings when
present. The parser may tolerate the older flat `sources` shape during the MVP
transition, but commands should write the nested `sources.skills` shape.

Skill entries represent active skills and should use compact `source:path`
strings by default. Use object entries only when the skill needs metadata such
as an alias or skill-level ref:

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
      "kind": "skill",
      "source": "source-name",
      "sourceType": "git",
      "sourceUrl": "https://example.com/skills.git",
      "requestedRef": "main",
      "resolvedCommit": "commit-sha",
      "sourcePath": "path/to/skill",
      "packagePath": ".agents/packages/skills/source-name/path/to/skill",
      "activationPath": ".agents/skills/active-name",
      "originalName": "natural-name",
      "activeName": "active-name",
      "alias": "optional-active-name",
      "packageFiles": [
        {
          "path": "SKILL.md",
          "sha256": "file-hash"
        }
      ],
      "activeFiles": [
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

Default external sources should be discoverable without automatic activation.

`aix add skills <git-or-github-tree-url> [alias]` should add a skill source
definition, resolve the Git ref, and discover valid skill folders. The optional
alias sets the local source name. The command should accept normal Git URLs
plus GitHub tree URLs and normalize tree URLs into `url`, `ref`, and `path`
fields. For example,
`https://github.com/mattpocock/skills/tree/main/skills` becomes the
`https://github.com/mattpocock/skills.git` Git source, ref `main`, and path
`skills`.

Source addition should prefetch into the shared Git cache and write enough
local source metadata to support `aix list skills <source>` without another network
round trip. It should not copy every discovered skill into `.agents/packages`
by default, because skill collections may contain many skills or heavy
supporting files. `.agents/packages/skills/<source>/...` is reserved for the
project-local package copies needed by active skills.

This keeps source discovery local and fast while avoiding project directory
bloat. `aix activate` materializes the requested skill package from the cache
into `.agents/packages/skills/<source>/...`, then exposes it through
`.agents/skills`.

The MVP supports the `skills` source kind. Using `aix add skills` keeps the
command semantic and leaves room for later `aix add agents` or
`aix add automations` commands.

`aix remove skills <source-name>` removes a configured skill source only when
no active skills depend on it. If active manifest or lockfile entries still
reference the source, it should fail and tell the user to deactivate those
skills first. When safe, it should remove the source entry, matching source
metadata, and the empty top-level `.agents/packages/skills/<source-name>`
directory. It should not recursively delete package contents.

`aix remove skills` without a source name should prompt the user to select one
configured skill source by number, then run the same remove path as
`aix remove skills <source-name>`. The interactive list should include
configured manifest sources, not built-in defaults that are not present in
`aix.json`. Every user selection menu should include `q - Quit` directly after
the selectable options. Sources that cannot be removed yet should be shown in a
final section headed `To remove the following sources deactivate their skills
first:`.

`aix list` should show an interactive list-kind picker. The MVP should include
`skills` and `q - Quit`; later versions can add kinds such as `agents`.

`aix list skills` should show an interactive source picker and then list valid
skill folders from the selected source. `aix list skills <source>` should
resolve the source, inspect its configured path, and report valid skill
folders without prompting. For flat sources, direct child folders containing
`SKILL.md` are skills. For nested sources, descendant folders containing
`SKILL.md` are skills and should be reported by their source-relative path.
Skill-list output uses one skill per line:

```text
source-relative/path<TAB>skill-name
```

Discovery through `aix list skills <source>` must not modify `aix.json`,
`aix.lock.json`, `.agents/packages`, or `.agents/skills`.

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

1. Create `.agents/`, `.agents/packages/`, and `.agents/skills/` when missing.
2. Create `aix.json` when missing.
3. Write initial source definitions for `aix`, `mattpocock`, and
   `cursor-pstack`.
4. Resolve and prefetch source metadata for the `aix` Git source.
5. Resolve and prefetch source metadata for `cursor-pstack` enough to activate
   `cursor-pstack/unslop`.
6. Declare every default active skill using compact `source:path` entries.
7. Activate all default skills into `.agents/skills`.
8. Write `aix.lock.json` with package and activation file hashes.

Init must not overwrite local edits silently. If `.agents/skills`, `aix.json`,
`.agents/packages`, or `aix.lock.json` already exist, init should validate the
current state and stop with an actionable error before changing files when it
cannot prove the write is safe.

## Activation Flow

An activation should:

1. Read and validate `aix.json`.
2. Resolve each Git source and requested ref.
3. Locate the requested skill in the cache or source metadata.
4. Materialize the requested skill package under `.agents/packages/skills`.
5. Validate `SKILL.md` front matter.
6. Determine the active name from alias or natural skill name.
7. Detect active-name collisions before changing `.agents/skills`.
8. Check local files against lockfile hashes.
9. Refuse to overwrite local edits.
10. Create `.agents/skills/<active-name>` as a symlink to the package skill
   folder when the active name matches the package skill name.
11. For aliases, create a managed activation wrapper or materialized directory
   only when needed so `SKILL.md` front matter `name:` matches the active name
   without mutating the package copy.
12. Hash package files and active skill files.
13. Write `aix.lock.json` atomically.

A deactivation should:

1. Read and validate `aix.json` and `aix.lock.json`.
2. Resolve the requested active skill by active name.
3. Check active files against lockfile hashes.
4. Refuse to remove locally edited active files.
5. Remove `.agents/skills/<active-name>`.
6. Update manifest and lockfile active state.
7. Leave `.agents/packages/skills/<source>/...` in place unless a later cleanup
   command owns package pruning.

## Local Drift Protection

The tool must never silently overwrite local edits.

If a materialized package file or active skill file differs from the checksum
in the lockfile, activate or update should stop with an actionable error.

The MVP should not attempt automatic merges.

## Skill Naming

Skills activate with their natural name by default:

```text
cursor-pstack/tdd -> .agents/skills/tdd
```

If two skills want the same active name, activation fails and asks the user to
add an alias.

When an alias is provided:

- the alias must be unique
- the alias must be a valid folder name
- active `SKILL.md` front matter `name:` should match the alias
- the lockfile records the original name and active name
