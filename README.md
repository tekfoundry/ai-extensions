# AI Extensions

AI Extensions (`aix`) is a package-manager-style CLI for managing AI assets in
your project.

Right now, `aix` focuses on workflows and skills. Skills are reusable
instructions that coding agents can discover through common project
conventions. Workflows package higher-level process guidance, project-local
agent docs, and the skills that support that process.

Today, teams usually manage those skills by copying or coupling them into each
project. That makes useful agent behavior harder to reuse, review, and update.
AI Extensions breaks that coupling. It gives teams one place to declare skill
sources, install a shared workflow, activate selected skills into
`.agents/skills`, lock exact Git commits and file hashes, and refuse updates
when local files have been edited.

The first release is intentionally narrow, but the model can grow to other AI
assets later. Skills and workflows are the starting point because teams already
share them through Git, and a shared repo is a practical way to manage AI
assets as a first-class part of the SDLC.

The command is `aix`. The npm package is `@tekfoundry/aix`.

## why teams use it

- Keep AI skills close to the code they affect.
- Share one reviewed skill collection across many projects.
- Decouple reusable skills from any single application repository.
- Install a shared AI Agent Workflow across projects without hand-copying
  `.agents` files.
- Treat AI assets like part of the delivery process, not side files copied by hand.
- Activate only the skills a project needs.
- Track exactly which Git commit each skill came from.
- Catch local edits before an update overwrites someone’s work.
- Give agents a predictable `.agents/skills` directory to scan.
- Make skill updates reviewable through `aix skills diff` before running `aix skills update`.
- Use aliases when different sources publish skills with the same name.
- Start with Git instead of a new registry, account, or hosting service.
- Leave room for other AI assets without changing the daily `aix` command.

## install

The package is prepared for scoped npm distribution:

```bash
npm install -g @tekfoundry/aix
```

During local development, run the CLI from this repository:

```bash
npm install
npm run build
node bin/aix.js --help
```

## quick start

### initialize a project

```bash
aix init
```

**What Happens**

`aix` installs the default `design-plan-execute` workflow and creates the local
files and directories it manages:

```text
aix.json
aix.lock.json
AGENTS.md
.agents/
  packages/
    workflows/
    skills/
  skills/
_docs/
  design/
  plans/
```

Under the hood, the workflow package is copied into
`.agents/packages/workflows`, workflow docs are installed into `.agents/`, the
workflow-owned block is appended to root `AGENTS.md`, and workflow-local skills
are exposed through `.agents/skills`.

### install a workflow

```bash
aix workflow install
aix workflow install https://github.com/example/ai-assets/tree/main/workflows/team-flow team-flow
```

**What Happens**

Without a URL, `aix` lists bundled workflows from `aix/workflows` and asks which
one to install. With a URL, it installs that Git-backed workflow directly.

After selection, `aix` resolves the Git source, reads `workflow.json`, copies
the workflow as one unit, installs its docs, appends its managed `AGENTS.md`
block, activates its local skills, scaffolds missing `_docs` directories, and
records all installed files in `aix.lock.json`. Only one workflow can be active
at a time. If another workflow is already active, install stops and tells you to
run `aix workflow uninstall` first.

### add skill sources

```bash
aix skills add https://github.com/example/skills/tree/main/skills team-skills
aix skills add https://github.com/mattpocock/skills/tree/main/skills mattpocock
aix skills add https://github.com/cursor/plugins/tree/main/pstack/skills cursor-pstack
```

**What Happens**

`aix` records each source in `aix.json`, normalizes GitHub tree URLs into Git
source details, fetches the repo into the shared cache, and indexes valid skill
folders. It does not copy every skill into your project or activate anything.

### list available skills

```bash
aix skills list mattpocock
```

**What Happens**

`aix` reads the cached source metadata and prints valid skill
folders without changing `aix.json`, `aix.lock.json`, `.agents/packages`, or
`.agents/skills`.

### activate a skill

```bash
aix skill activate mattpocock/engineering/typescript
```

**What Happens**

`aix` copies the selected skill package into
`.agents/packages/skills`, exposes it through `.agents/skills`, adds the root
skill to `aix.json`, and records the resolved Git commit plus file hashes in
`aix.lock.json`.

### activate with an alias

```bash
aix skill activate cursor-pstack/tdd cursor-tdd
```

**What Happens**

Aliases give the active skill a project-local name without
mutating the fetched package copy. That keeps upstream content intact while
still avoiding naming collisions in `.agents/skills`.

### verify the installed state

```bash
aix verify
```

**What Happens**

`aix` compares the manifest, lockfile, workflow docs, managed `AGENTS.md`
block, package files, active skill files, hashes, front matter names, aliases,
ownership metadata, and active-name collisions.

### review and accept updates

```bash
aix skills diff
aix skills update
aix workflow diff
aix workflow update
```

**What Happens**

`aix skills diff` compares locked skill package copies with the currently resolved
source version without changing files. `aix skills update` refreshes locked skill
packages and hashes only after local drift checks pass.

`aix workflow diff` and `aix workflow update` do the same for the active
workflow package, installed workflow docs, the managed `AGENTS.md` block, and
workflow-owned skills.

### deactivate a root skill

```bash
aix skill deactivate cursor-tdd
```

**What Happens**

`aix` removes the active skill, updates manifest and lockfile
state, checks for local edits first, and cleans up package copies that are no
longer needed. If the skill is owned by the active workflow, the command stops
and tells you to uninstall the workflow instead.

### uninstall a workflow

```bash
aix workflow uninstall
```

**What Happens**

`aix` removes the active workflow docs, workflow-owned skills, workflow package
copy, and managed `AGENTS.md` block after drift checks pass. It preserves
project-owned `AGENTS.md` content outside the managed block and leaves `_docs`
content in place.

### remove unused sources

```bash
aix skills remove team-skills
aix skills remove mattpocock
aix skills remove cursor-pstack
```

**What Happens**

`aix` removes the source declaration and cached source
metadata only when no active manifest or lockfile entries still depend on that
source.

## commands

```bash
aix init
aix status
aix workflow install [git-or-github-tree-url] [alias]
aix workflow uninstall
aix skills add <git-or-github-tree-url> [alias]
aix skills remove <source-name>
aix skill activate [source/path] [alias]
aix skill deactivate <active-name>
aix skills update
aix skills update <source>/<path>
aix workflow update
aix skills diff
aix skills diff <source>/<path>
aix workflow diff
aix verify
aix skills list [source]
```

Interactive forms are available for `workflow install`, `skills list`,
`skills remove`, `skill activate`, and `skill deactivate` when the target is
not provided.

## manifest

Projects declare workflow sources, the active workflow, skill sources, and root
active skills in `aix.json`.

```json
{
  "sources": {
    "workflows": {
      "aix": "https://github.com/tekfoundry/ai-extensions/tree/master/aix/workflows/design-plan-execute"
    },
    "skills": {
      "mattpocock": "https://github.com/mattpocock/skills/tree/main/skills",
      "private-skills": {
        "type": "git",
        "url": "git@github.com:example/private-skills.git",
        "path": "skills",
        "ref": "main"
      }
    }
  },
  "workflow": "aix:aix/workflows/design-plan-execute",
  "skills": [
    "mattpocock:engineering/typescript",
    {
      "source": "private-skills",
      "path": "review",
      "alias": "team-review"
    }
  ]
}
```

`sources.workflows` and `sources.skills` are configured source lists. String
values may use GitHub tree URLs. Object values are useful for SSH URLs,
non-GitHub Git URLs, custom paths, or explicit refs.

`workflow` stores the one active workflow. Workflows are all-or-nothing in the
MVP because they define the project process and own their local skills.

`skills` stores user-requested root skills. Dependency-only skills inferred
during activation are written to `aix.lock.json`, not to the manifest.

## lockfile

`aix.lock.json` records the exact installed state.

```json
{
  "lockfileVersion": 1,
  "workflows": [
    {
      "kind": "workflow",
      "source": "aix",
      "sourceType": "git",
      "sourceUrl": "https://github.com/tekfoundry/ai-extensions.git",
      "requestedRef": "master",
      "resolvedCommit": "0123456789abcdef0123456789abcdef01234567",
      "sourcePath": "aix/workflows/design-plan-execute",
      "packagePath": ".agents/packages/workflows/aix/design-plan-execute",
      "name": "design-plan-execute",
      "title": "Design, Plan, Execute",
      "docs": [
        {
          "sourcePath": "workflow.md",
          "targetPath": ".agents/workflow.md",
          "sha256": "..."
        }
      ],
      "agentsMd": {
        "path": "AGENTS.md",
        "marker": "aix:workflow design-plan-execute",
        "sha256": "..."
      },
      "skills": [
        {
          "sourcePath": "skills/task-execute",
          "activeName": "task-execute"
        }
      ],
      "packageFiles": [
        {
          "path": "workflow.json",
          "sha256": "..."
        }
      ]
    }
  ],
  "skills": [
    {
      "kind": "skill",
      "source": "mattpocock",
      "sourceType": "git",
      "sourceUrl": "https://github.com/mattpocock/skills.git",
      "requestedRef": "main",
      "resolvedCommit": "0123456789abcdef0123456789abcdef01234567",
      "sourcePath": "engineering/typescript",
      "packagePath": ".agents/packages/skills/mattpocock/engineering/typescript",
      "activationPath": ".agents/skills/typescript",
      "originalName": "typescript",
      "activeName": "typescript",
      "requested": true,
      "dependencies": [],
      "packageFiles": [
        {
          "path": "SKILL.md",
          "sha256": "..."
        }
      ],
      "activeFiles": [
        {
          "path": "SKILL.md",
          "sha256": "..."
        }
      ]
    }
  ]
}
```

The lockfile is how `aix verify`, `aix status`, `aix skills diff`, `aix skills update`, and
`aix skill deactivate` decide whether workflow docs, package files, active
skill files, and managed `AGENTS.md` blocks are still managed by AI Extensions.
If a managed file changes locally, commands that would overwrite or remove it
stop with an error.

## default sources

`aix init` installs one default workflow source:

- `aix`: `https://github.com/tekfoundry/ai-extensions.git`, path
  `aix/workflows/design-plan-execute`, ref `master`

The default workflow includes the reusable AI Agent Workflow docs and the
workflow-owned skills needed to follow the design-plan-execute process.

Additional built-in skill sources are available:

- `aix`: `https://github.com/tekfoundry/ai-extensions.git`, path `aix/skills`,
- `mattpocock`: `https://github.com/mattpocock/skills.git`, path `skills`
- `cursor-pstack`: `https://github.com/cursor/plugins.git`, path
  `pstack/skills`

The `aix/skills` path remains as transitional compatibility for skill-source
users. External skill sources such as `mattpocock` and `cursor-pstack` are
discoverable, then activated only when requested.

## MVP boundaries

The MVP supports Git-backed workflow and skill sources. It does not support
registries, plugin packages, global installs, automatic merges for local edits,
workflow replacement, or external workflow skill dependencies.

Package-managed skill copies live under `.agents/packages/skills/<source>/...`.
Package-managed workflow copies live under
`.agents/packages/workflows/<source>/<workflow>/...`. Active skills live under
`.agents/skills/<active-name>`. Project-owned documentation stays under
`_docs/`.

## bundled workflow skills

This repository includes the default AI Extensions workflow skills under
`aix/workflows/design-plan-execute/skills`:

- `project-init`
- `design-promote`
- `phase-execute`
- `plan-activate`
- `plan-complete`
- `plan-create`
- `plan-defer`
- `plan-execute`
- `plan-review`
- `plan-update`
- `task-execute`
- `work-verify`

## design docs

The current design lives in `_docs/design`.

- [_docs/design/README.md](_docs/design/README.md)
- [_docs/design/overview.md](_docs/design/overview.md)
- [_docs/design/cli.md](_docs/design/cli.md)
- [_docs/design/package-management.md](_docs/design/package-management.md)
- [_docs/design/bundled-skills.md](_docs/design/bundled-skills.md)
