# Bundled Skills

ASM should include a curated set of reusable workflow skills as importable
packages.

## Default Sources

ASM should start with three default sources:

1. `asm`
   - Type: bundled or local project source
   - Path: this repository's `.agents/skills`
   - Behavior: installed by default when ASM initializes a project
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

The `asm` source is the default workflow pack. External sources should be
available through discovery commands without installing their skills
automatically.

For example:

```bash
asm list asm
asm list mattpocock
asm list cursor-pstack
```

Skills from external sources should become installed only after an explicit
install action.

```bash
asm install cursor-pstack/tdd
asm install mattpocock/engineering/typescript
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

These `asm` source skills should be loaded by default when ASM initializes a
project unless the user explicitly chooses a smaller profile later.

Default skills should remain project-agnostic. Skills that depend heavily on a
specific application's build scripts, release flow, runtime stack, deployment
target, or operational policy should not be included in the default set. Those
are better handled as project-local skills or optional packages.

`release-build` is intentionally excluded from the default skill set because
build and release processes vary widely between projects.
