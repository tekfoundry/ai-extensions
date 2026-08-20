# Bundled Skills

AI Extensions should include a curated set of reusable workflow skills as
importable packages.

## Default Sources

AI Extensions should start with three default sources:

1. `aix`
   - Type: Git source
   - URL: `https://github.com/tekfoundry/ai-extension.git`
   - Path: `aix/skills`
   - Ref: `master`
   - Behavior: installed by default when AI Extensions initializes a project
2. `mattpocock`
   - Type: Git source
   - URL: `https://github.com/mattpocock/skills.git`
   - Path: `skills`
   - Behavior: discoverable and installable on demand
3. `cursor-pstack`
   - Type: Git source
   - URL: `https://github.com/cursor/plugins.git`
   - Path: `pstack/skills`
   - Behavior: discoverable and installable on demand

The `aix` source is the default workflow pack. All default sources use the same
Git resolution path.

`aix/skills` is the canonical source path inside the `aix` Git source.
`.agents/skills` is the local installed working set and should remain available
for the agent workflow while AI Extensions is being built.

For example:

```bash
aix list aix
aix list mattpocock
aix list cursor-pstack
```

Skills from external sources should become installed only after an explicit
install action.

```bash
aix install cursor-pstack/tdd
aix install mattpocock/engineering/typescript
```

These repository-local skills should be available for import by other projects:

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

The `unslop` skill is intentionally not included in `aix/skills`. `aix init`
should declare and install `cursor-pstack/unslop` from the `cursor-pstack`
source rather than from a local AI Extensions-only skill directory.

These `aix` source skills should be loaded by default when AI Extensions
initializes a project unless the user explicitly chooses a smaller profile
later.

Default skills should remain project-agnostic. Skills that depend heavily on a
specific application's build scripts, release flow, runtime stack, deployment
target, or operational policy should not be included in the default set. Those
are better handled as project-local skills or optional packages.

`release-build` is intentionally excluded from the default skill set because
build and release processes vary widely between projects.
