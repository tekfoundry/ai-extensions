# Bundled Skills And Workflows

AI Extensions should include a curated agent workflow and the reusable skills
that workflow needs.

## Default Sources

AI Extensions should start with three default sources:

1. `aix`
   - Type: Git source
   - URL: `https://github.com/tekfoundry/ai-extensions.git`
   - Path: `aix/skills`
   - Ref: `master`
   - Behavior: default bundled skills that are not workflow-owned.
2. `mattpocock`
   - Type: Git source
   - URL: `https://github.com/mattpocock/skills.git`
   - Path: `skills`
   - Behavior: discoverable and activatable on demand
3. `cursor-pstack`
   - Type: Git source
   - URL: `https://github.com/cursor/plugins.git`
   - Path: `pstack/skills`
   - Behavior: discoverable and activatable on demand

The `aix` workflow source is the default workflow pack. The `aix` skill source
is reserved for default bundled skills that are not owned by the workflow. It
contains project-agnostic helpers such as `discover-skill`. All default sources
use the same Git resolution path.

`discover-skill` should guide an agent through advisory discovery only. It
searches configured skill sources and its bundled `known-sources.json` source
index before asking the user whether to broaden to unreviewed GitHub or
internet results. Candidate output should include concise summaries, source
URLs, source-relative skill paths, direct review links to `SKILL.md`, source
trust status, unsafe-flag notes, and `q - Quit`. The helper should not present
weak or uninspectable matches as install-ready.

When the user replies with `install #`, `discover-skill` should show an
install review packet before any command runs. That packet should list files
to review, summarize the skill assessment, preview the exact `aix skills add`
and `aix skill activate` commands, and wait for `confirm install #`.

The default workflow should live under:

```text
aix/workflows/design-plan-execute/
  README.md
  workflow.md
  engineering-best-practices.md
  skills/
```

`aix init` should install that workflow as a unit. The workflow docs are copied
into `.agents/`, and the workflow-local skills under `skills/` are exposed
through `.agents/skills`.

Workflow-owned lifecycle skills live under
`aix/workflows/design-plan-execute/skills` so the workflow and its owned skills
ship together. `aix/skills` should not duplicate those workflow-owned skills;
it is reserved for default bundled skills that should remain installed outside
the workflow lifecycle.
`.agents/packages/skills` is the local source-organized package store for
active skills. The extra `skills` segment leaves `.agents/packages` available
for future extension kinds without changing the active-skill layout.
`.agents/skills` is the active working set exposed to agents and should remain
available for the agent workflow while AI Extensions is being built.

For example:

```bash
aix skills list aix
aix skills list mattpocock
aix skills list cursor-pstack
```

Skills from external sources should become active only after an explicit
activation action.

```bash
aix skill activate cursor-pstack/tdd
aix skill activate mattpocock/engineering/typescript
```

These repository-local skills should be available as workflow-owned skills in
the default `aix` workflow:

- `brainstorming-skill`
- `project-init`
- `design-create`
- `design-promote`
- `documentation-review`
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
- `code-review-refactor`
- `delegate-to-role`

`brainstorming-skill` is workflow-owned because it depends on the workflow's
project documentation shape, plan lifecycle, product-strategy role delegation,
and `plan-create` handoff. It should run independently when invoked directly,
but it ships with the workflow so workflow-owned roles such as
`product-strategist` can rely on it being installed.

The `unslop` skill is intentionally not included in `aix/skills`. `aix init`
should declare and activate `cursor-pstack/unslop` from the `cursor-pstack`
source rather than from a local AI Extensions-only skill directory.

These workflow-owned skills should be loaded by default when AI Extensions
initializes a project unless the user explicitly chooses a smaller profile
later. `code-review-refactor` is workflow-owned because it depends on the
workflow engineering guidance and plan lifecycle skills.

This standalone `aix` skill should also be activated by default during
`aix init`, but it is not workflow-owned and should remain active after
workflow uninstall:

- `discover-skill`

Default skills should remain project-agnostic. Skills that depend heavily on a
specific application's build scripts, release flow, runtime stack, deployment
target, or operational policy should not be included in the default set. Those
are better handled as project-local skills or optional packages.

`release-build` is intentionally excluded from the default skill set because
build and release processes vary widely between projects.
