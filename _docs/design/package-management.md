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
- whether the skill was directly requested by the user or activated only as a
  dependency
- package and active file hashes
- active workflow name, source, resolved commit, installed docs, workflow-owned
  skills, workflow template hashes, and workflow file hashes when a workflow is
  installed

The manifest represents root user intent. The lockfile represents the exact
fetched and active state, including dependency-only active skills and the
active workflow.

`aix status` should read both files and summarize the installed state without
changing project files. It should report missing manifest or lockfile files as
workspace setup status, not as a destructive repair action.

The initial manifest schema is:

```json
{
  "sources": {
    "workflows": {
      "aix": "https://github.com/tekfoundry/ai-extensions/tree/master/aix/workflows/design-plan-execute"
    },
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
  "workflow": "aix:aix/workflows/design-plan-execute",
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

`sources.workflows` contains configured workflow sources. The first workflow
implementation should usually write this entry as part of
`aix workflow install` instead of requiring a separate add step. The manifest
should allow one active root workflow through `workflow`, because workflows are
all-or-nothing process packages for the MVP.

Skill entries represent user-requested root active skills and should use
compact `source:path` strings by default. Dependency-only skills inferred
during activation are not written to `aix.json`; they are resolved into
`aix.lock.json` and exposed through `.agents/skills` only while still needed by
a root active skill. Use object entries only when the root skill needs metadata
such as an alias or skill-level ref:

```json
{
  "skills": [
    "source-name:path/to/skill",
    {
      "source": "private-source",
      "path": "path/to/private-skill",
      "alias": "team-skill"
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
      "requested": true,
      "dependencies": [
        {
          "source": "source-name",
          "sourcePath": "path/to/dependency",
          "activeName": "dependency-active-name",
          "type": "inferred",
          "reason": "Call the Skill tool with \"dependency-name\"."
        }
      ],
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

## Workflow Packages

Workflows are first-class AI assets. A workflow installs process guidance under
`.agents/`, creates missing project-owned documentation directories, and
activates the workflow-local skills needed to follow that process.

Workflow packages should use a small `workflow.json` install manifest plus a
conventional directory layout. The manifest names the workflow and declares
integration points that convention cannot safely infer, especially the root
`AGENTS.md` managed block. Recognized docs such as `README.md`, `workflow.md`,
and `engineering-best-practices.md` are installed into `.agents/`. Valid skills
under `skills/<name>/SKILL.md` are workflow-owned skills.

The default `aix` workflow source should live under:

```text
aix/workflows/design-plan-execute/
  workflow.json
  AGENTS.append.md
  README.md
  workflow.md
  engineering-best-practices.md
  templates/
    plan.md
    sections/
      phase.md
  skills/
    project-init/
      SKILL.md
```

Workflow-owned skills should be materialized under
`.agents/packages/workflows/<source>/<workflow>/skills/...` and exposed through
`.agents/skills/<active-name>`. They should not be added to the manifest
`skills` list, because the root user intent is the active workflow.

Workflow origin templates should be materialized under
`.agents/packages/workflows/<source>/<workflow>/templates/...`. Their hashes are
recorded in the active workflow lockfile entry under `templates`, and the full
package hash list still records them as package files. `aix verify` should
report missing or drifted origin templates. Workflow update, diff, and
uninstall should include origin templates with the rest of the package-managed
workflow content.

Published templates under `.agents/templates/` are not package-managed origin
files. They are user-editable project overrides created only by
`aix templates publish`. Publishing should refuse to overwrite a published
template that differs from its origin. Resetting a template deletes the
published override and lets resolution fall back to the package-managed origin.
`aix templates reset --all` deletes every published override that belongs to
the active workflow template set while preserving unrelated project files under
`.agents/templates/`.

Root `AGENTS.md` is mixed ownership. `aix workflow install` should insert or
update the workflow text from `AGENTS.append.md` inside a marker-delimited
managed block. The block is package-managed and hash-checked in the lockfile.
Everything outside the block is project-owned and must be preserved.

Only one workflow may be active at a time in the MVP. Installing another
workflow should fail until a later explicit replace flow is designed.

`aix skill deactivate <active-name>` should refuse direct removal of
workflow-owned skills. Removing or replacing the workflow owns that lifecycle.
Local edits to workflow docs, the managed `AGENTS.md` block, or workflow-owned
skills are drift. Local edits to workflow origin templates are also drift.
`aix verify` and `aix status` should report them, and workflow update/uninstall
commands should refuse to overwrite or delete them.

## Source Discovery

Default external sources should be discoverable without automatic activation.

The bundled `discover-skill` helper provides a conversational discovery layer
on top of the existing source model. It does not add a registry or a second
installation path. It should search configured skill sources first, then the
user-editable known-source index stored at
`aix/skills/discover-skill/known-sources.json`. That index is a simple JSON
list of source URLs. It is discovery input only: it does not install, lock,
version, certify, or trust a source.

If configured sources and the known-source index do not produce enough
credible, inspectable candidates, the helper should ask the user before
broadening to unreviewed GitHub or internet results. Any outside-source
candidate should be labeled as unreviewed. Candidate ranking should keep
relevance, installability, and trust separate, and should reject weak matches
instead of padding the result list.

Installing a discovered skill remains safety-sensitive and must route through
normal package-management commands. A user reply such as `install 2` starts an
install review packet only. The helper should list files to inspect, provide
an initial assessment and unsafe-flag notes, preview the exact commands, and
wait for `confirm install 2` before running `aix skills add` and
`aix skill activate`.

`aix skills add <git-or-github-tree-url> [alias]` should add a skill source
definition, resolve the Git ref, and discover valid skill folders. The optional
alias sets the local source name. The command should accept normal Git URLs
plus GitHub tree URLs and normalize tree URLs into `url`, `ref`, and `path`
fields. For example,
`https://github.com/mattpocock/skills/tree/main/skills` becomes the
`https://github.com/mattpocock/skills.git` Git source, ref `main`, and path
`skills`.

Source addition should prefetch into the shared Git cache and write enough
local source metadata to support `aix skills list <source>` without another network
round trip. It should not copy every discovered skill into `.agents/packages`
by default, because skill collections may contain many skills or heavy
supporting files. `.agents/packages/skills/<source>/...` is reserved for the
project-local package copies needed by active skills.

This keeps source discovery local and fast while avoiding project directory
bloat. `aix skill activate` materializes the requested skill package from the cache
into `.agents/packages/skills/<source>/...`, records only the user-requested
root skill in the manifest `skills` list, then exposes the requested skill and
any inferred dependency skills through `.agents/skills`.

The MVP supports the `skills` source kind. Using `aix skills add` keeps the
command semantic and leaves room for later `aix agents add` or
`aix automations add` commands.

`aix skills remove <source-name>` removes a configured skill source only when
no active skills depend on it. If active manifest or lockfile entries still
reference the source, it should fail and tell the user to deactivate those
skills first. When safe, it should remove the source entry, matching source
metadata, and the empty top-level `.agents/packages/skills/<source-name>`
directory. It should not recursively delete package contents.

`aix skills remove` without a source name should prompt the user to select one
configured skill source by number, then run the same remove path as
`aix skills remove <source-name>`. The interactive list should include
configured manifest sources, not built-in defaults that are not present in
`aix.json`. Every user selection menu should include `q - Quit` directly after
the selectable options. Sources that cannot be removed yet should be shown in a
final section headed `To remove the following sources deactivate their skills
first:`.

`aix skills list` should show an interactive source picker and then list valid
skill folders from the selected source. `aix skills list <source>` should
resolve the source, inspect its configured path, and report valid skill
folders without prompting. For flat sources, direct child folders containing
`SKILL.md` are skills. For nested sources, descendant folders containing
`SKILL.md` are skills and should be reported by their source-relative path.
Skill-list output includes `Path`, `Name`, and `Install Command` columns.
For normal skill-source rows, the install command is
`aix skill activate <source>/<path>`.

```text
Path<TAB>Name<TAB>Install Command
```

`aix skills list <source> --missing-only` should filter the table to skills
whose source/path is not already present in the lockfile. The default list
output remains the full discoverable catalog.

When listing the `aix` source and the project has an installed `aix` workflow,
the list should include both standalone skills from `aix/skills` and
workflow-owned skills from the installed workflow's `skillsDir`. Workflow skill
rows use `aix workflow update` as the install command, because workflow-owned
skills are managed by the workflow package rather than direct skill activation.

Discovery through `aix skills list <source>` must not modify `aix.json`,
`aix.lock.json`, `.agents/packages`, or `.agents/skills`. Status output should
follow the same default: it may inspect local files and compare source refs for
update availability, but it must not update the manifest, lockfile, package
copies, active skills, workflow docs, or managed `AGENTS.md` content.

## Skill Dependencies

AI Extensions should preserve skill dependency safety even when third-party
skills do not declare a formal dependency field. The MVP infers dependencies
from `SKILL.md` instructions that tell the agent to call another skill, such as
`Call the Skill tool with "grilling".`

Dependency inference should:

1. Parse the target skill's `SKILL.md` for skill-tool call instructions.
2. Resolve each inferred skill name against discovered skills in the same
   source by `SKILL.md` front matter `name`.
3. Continue only when each inferred dependency resolves to exactly one skill.
4. Activate inferred dependencies before activating the requested skill.
5. Resolve dependencies recursively and stop with a clear error if a cycle is
   found.
6. Record resolved dependency edges in `aix.lock.json`, including the source,
   source path, active name, dependency type, and the instruction that caused
   the inference.
7. Mark lockfile skill entries with whether they were directly requested by
   the user or activated only to satisfy another active skill.

The dependency graph in `aix.lock.json` is the durable source for deactivation
protection and dependency cleanup. Deactivation should refuse to remove a
dependency-only active skill while another active lockfile entry depends on it.
When a user-requested root skill is deactivated, AI Extensions should remove
that root skill from `aix.json`, remove its active link, then remove any
dependency-only active skills that are no longer reachable from the remaining
requested roots. Deactivation should also remove package copies for every
removed active skill when the package files still match the lockfile hashes.
After removing a package copy, deactivation should remove empty package parent
directories until it reaches `.agents/packages/skills`, stopping at the first
non-empty directory and never deleting the managed skills package root.
If package files have local edits, deactivation must stop before removing
active files, package files, manifest entries, or lockfile entries.

Package copies that are still required by another active root must remain in
place. Package copies that cannot be removed because of local edits are left
for the user to move, restore, or clean up with a later explicit pruning
workflow.

Interactive deactivation should present only user-requested root active skills.
Dependency-only active skills should be omitted from the picker because they
are removed automatically when their last root dependent is deactivated.

If a future shared `SKILL.md` metadata standard defines explicit dependencies,
AI Extensions can support that field in addition to inference. Until then,
inference reflects the way agents already discover skill-to-skill calls while
executing a skill.

Git sources are cloned or fetched into a deterministic cache outside the
project by default. The default cache root is the operating system temp
directory under `aix-cache`; tests and callers can override it with
`AIX_CACHE_DIR`. Source cache directory names are derived from source names
using only filesystem-safe characters. Git refs resolve to exact commit SHAs
before discovery reads source files. When a source omits an explicit ref, AI
Extensions resolves `origin/HEAD` after fetching so update and diff commands
track the source repository's default branch instead of the cache worktree's
detached `HEAD`.

The source cache is derived data. If a cache entry has a `.git` directory but
is missing the expected `origin` remote, source resolution should treat that
entry as malformed cache data, remove only that source cache directory, and
reclone it from the configured source URL. User-owned project files,
manifest entries, lockfile entries, package copies, and active skills must not
be repaired or rewritten by this cache recovery path.

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
3. Install the default `aix/design-plan-execute` workflow from `aix/workflows`.
4. Write initial source definitions for `aix`, `mattpocock`, and
   `cursor-pstack`.
5. Resolve and prefetch source metadata for the `aix` Git source.
6. Resolve and prefetch source metadata for `cursor-pstack` enough to activate
   `cursor-pstack/unslop`.
7. Declare the active workflow in `aix.json`.
8. Activate workflow-owned skills into `.agents/skills`.
9. Write `aix.lock.json` with workflow doc, package, and activation file
   hashes.

Init must not overwrite local edits silently. If `.agents/skills`, `aix.json`,
`.agents/packages`, or `aix.lock.json` already exist, init should validate the
current state and stop with an actionable error before changing files when it
cannot prove the write is safe.

## Activation Flow

An activation should:

1. Read and validate `aix.json`.
2. Resolve each Git source and requested ref.
3. Locate the requested skill in the cache or source metadata.
4. Infer and resolve the requested skill's dependency tree.
5. Refuse activation when a target package directory already exists outside
   the lockfile and its files do not exactly match the resolved source skill.
6. Materialize each dependency package before the requested skill package under
   `.agents/packages/skills`.
7. Validate `SKILL.md` front matter.
8. Determine the active name from alias or natural skill name.
9. Detect active-name collisions before changing `.agents/skills`.
10. Check local files against lockfile hashes.
11. Refuse to overwrite local edits.
12. Create `.agents/skills/<active-name>` as a symlink to the package skill
   folder when the active name matches the package skill name.
13. For aliases, create a managed activation wrapper or materialized directory
   only when needed so `SKILL.md` front matter `name:` matches the active name
   without mutating the package copy.
14. Add or update only the user-requested root skill in the manifest `skills`
   list.
15. Hash package files and active skill files.
16. Write `aix.lock.json` atomically with dependency edges and requested versus
   dependency-only activation state.

A deactivation should:

1. Read and validate `aix.json` and `aix.lock.json`.
2. Resolve the requested active skill by active name.
3. Refuse direct deactivation of a dependency-only active skill when another
   active skill depends on it.
4. Check active and package files against lockfile hashes.
5. Refuse to remove locally edited active or package files.
6. Remove `.agents/skills/<active-name>`.
7. Remove no-longer-needed `.agents/packages/skills/<source>/...` package
   copies.
8. If the deactivated skill was a user-requested root, remove it from
   `aix.json` and remove orphaned dependency-only active skills that are no
   longer reachable from remaining requested roots.
9. Update lockfile active state.

## Local Drift Protection

The tool must never silently overwrite local edits.

If a materialized package file or active skill file differs from the checksum
in the lockfile, activate, deactivate, or update should stop with an
actionable error.

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
