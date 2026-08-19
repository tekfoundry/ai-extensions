# AGENTS.md

This file is the repo-specific entrypoint for AI coding agents working in `asm`.

## Read Order

1. Read this file first.
2. Read `.agents/workflow.md` before substantial implementation work.
3. Read `_docs/design/README.md` for current design intent.
4. Read relevant plans in `_docs/plans` when implementation work is tied to a plan.

Repository-local skills live under `.agents/skills/`. Tool-specific skill
directories such as `.codex/skills/` and `.claude/skills/` should be
directory-level compatibility symlinks to that canonical location. When a task
explicitly invokes a local skill, or clearly matches its description, read that
skill's `SKILL.md` and follow it.

## Project Snapshot

`asm` is Agent Skills Manager: a small package-manager-style CLI for managing
AI-agent skills in software projects.

The intended CLI command is:

```bash
asm install
asm update
asm diff
asm verify
```

The package is expected to be implemented in TypeScript on Node.js and
distributed as a scoped npm package, while installing the short `asm` binary.

## Repository Map

- `.agents/`: reusable agent process structure and project-local skills
- `.agents/skills/`: canonical reusable workflow skills
- `.codex/skills`, `.claude/skills`: tool-specific compatibility symlinks to `.agents/skills`
- `_docs/design/README.md`: stable current design intent
- `_docs/plans/`: implementation plans

## Current Design Priorities

1. Provide a package-manager-style workflow for project-local AI-agent skills.
2. Keep `.agents/` package-managed and `_docs/` project-owned.
3. Install skills with natural names by default.
4. Detect naming collisions clearly and require explicit aliases.
5. Lock resolved Git commits and installed file hashes.
6. Refuse to overwrite local edits silently.
7. Keep the MVP focused on Git-based sources, installs, updates, diffs, and verification.

## Work Modes

Use `.agents/workflow.md` for the reusable planning and execution lifecycle.

In short:

- Backlog plans in `_docs/plans/backlog/` are not implementation authorization.
- Active plans in `_docs/plans/` are authorized implementation records.
- Small micro-fixes may proceed without a plan when existing design intent
  already covers the behavior and the change is tightly scoped.

## Task Completion Requirements

Do not consider implementation work complete until relevant verification has
been run or the verification gap has been reported.

Because this project is still being bootstrapped, default commands may not exist
yet. Once the TypeScript CLI is scaffolded, prefer targeted checks first, then
broader checks such as:

```bash
npm test
npm run typecheck
npm run build
```

If a relevant check was not run, state that explicitly in the final handoff.
Every final handoff should include documentation impact when docs were relevant.

## Repo-Specific Safety Rules

- Preserve user-authored files and unrelated worktree changes.
- Treat lockfile writes, skill installs, updates, aliases, and removals as
  safety-sensitive because they can overwrite project-local agent behavior.
- Never silently overwrite local edits in `.agents/skills`.
- Keep project-owned documentation in `_docs/` separate from package-managed
  agent process files in `.agents/`.
- Do not add registry, plugin-package, global-install, or publishing behavior
  to the MVP unless the design docs or an approved plan explicitly authorize it.

## Documentation Pointers

- Repo-specific agent entrypoint: `AGENTS.md`
- Reusable agent process router: `.agents/README.md`
- Workflow and planning rules: `.agents/workflow.md`
- Agent-facing engineering guidance: `.agents/engineering-best-practices.md`
- Reusable workflow skills: `.agents/skills`
- Stable ASM design intent: `_docs/design/README.md`
- ASM implementation plans: `_docs/plans`
