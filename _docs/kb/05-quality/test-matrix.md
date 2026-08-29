# Test Matrix

## CLI And User-Facing Output

Tests in `tests/cli.test.mjs` cover command registry behavior, splash/help
output, usage failures, unsupported old command forms, object-group command
organization, package docs command syntax, and interactive source selection.

Quality risks:

- command aliases accidentally reintroduced
- help output diverging from implemented command registry
- interactive commands becoming unusable without a target argument
- output changing in a way that weakens next-step guidance

Targeted checks:

```bash
node --test tests/cli.test.mjs
node --test tests/ui-selection-prompt.test.mjs
```

## Manifest, Lockfile, And Drift

Tests in `tests/manifest.test.mjs`, `tests/lockfile.test.mjs`, and
`tests/lockfile-drift.test.mjs` cover accepted JSON shapes, legacy source
shape, compact and object requests, malformed input errors, missing files,
atomic lockfile writes, workflow-owned role entries, malformed role entries,
and file-hash drift comparison.

Quality risks:

- accepting malformed package intent
- breaking backwards-compatible manifest parsing
- losing lockfile owner or role data
- missing unexpected files during drift comparison

Targeted checks:

```bash
node --test tests/manifest.test.mjs
node --test tests/lockfile.test.mjs tests/lockfile-drift.test.mjs
```

## Sources

Tests in `tests/sources.test.mjs` cover default source definitions, Git clone
and commit resolution, cache URL changes, cache recloning, source addition,
source metadata, GitHub tree URL normalization, source listing, and source
removal blockers.

Quality risks:

- mutating the wrong source metadata
- treating a stale cache as accepted package state
- removing a source while active manifest or lockfile entries still depend on it
- failing to normalize GitHub tree URLs consistently

Targeted check:

```bash
node --test tests/sources.test.mjs
```

## Skills

Tests in `tests/skills.test.mjs`, `tests/activation.test.mjs`,
`tests/diff.test.mjs`, and `tests/update.test.mjs` cover discovery, listing,
activation, aliases, local bundled source precedence, active-name collisions,
preflight no-write behavior, inferred dependencies, deactivation, orphan
cleanup, interactive activation/deactivation, dirty package refusal, edited
active/package refusal, diff, and update.

Quality risks:

- silently overwriting local edits
- exposing a skill under the wrong active name
- deleting dependency-only skills that are still reachable
- mutating package or lockfile state during diff
- updating workflow-owned skills through standalone commands

Targeted checks:

```bash
node --test tests/skills.test.mjs
node --test tests/activation.test.mjs
node --test tests/diff.test.mjs tests/update.test.mjs
```

## Roles

Tests in `tests/roles.test.mjs` cover path helpers, front matter parsing,
delegation resolution, prompt-overlay construction, role contract validation,
metadata hints, role discovery, bundled development roles, role CLI lifecycle,
diff/update, local bundled source precedence, bundled project-manager
activation, companion `*.GUIDANCE.md` activation and update preservation,
role-owned skill deactivation refusal, aliases, active-name collisions,
workflow-owned role deactivation refusal, verify, and status reporting.

Quality risks:

- implicit delegation routing to the wrong role
- host-native agent files being written by delegation fallback
- role metadata becoming an implicit install path
- active role drift going unreported
- project-manager append instructions appearing when the role is inactive
- companion guidance being flattened into `GUIDANCE.md` or overwriting local
  edits during role update
- workflow-owned roles being removable through standalone commands

Targeted check:

```bash
node --test tests/roles.test.mjs
```

## Guidance

Tests in `tests/guidance.test.mjs` cover workflow guidance discovery, metadata
parsing, list/publish/diff/reset behavior, role guidance reset, no-overwrite
guards, reset-all preview and confirmation, and preservation of unrelated
files.

Tests in `tests/skill-instructions.test.mjs` cover the optional
`get-guidance` skill contract, including required caller context, bounded
reading lists, activity-list caller context, unknown activity handling,
conflict reporting, no file mutation, project-manager startup separation, and
legacy fallback behavior.

Tests in `tests/roles.test.mjs` cover the bundled project-manager PM Review
contract. They check the case-insensitive `pm review` trigger examples, exact
canonical routing probes for roles and activities, no broad role fan-out,
per-role guidance planning, out-of-team handback, and the abort-before-work
rule. The same test file covers PM Context Packets by checking the bundled
project-manager packet shape and confirming every bundled workflow role has
conditional orientation rules for accepting packet baseline facts, re-reading
authority files, falling back to normal orientation, and returning compact
handoff evidence. The same role tests also pin the project-manager
activation-owned append text and guidance entry-routing section so they keep
requiring active project-manager routing before specialist roles, lifecycle
skills, or file work.

Tests in `tests/skill-instructions.test.mjs` cover lifecycle skill entry-gate
instructions. They fail if workflow lifecycle skills stop describing
themselves as procedures selected by project-manager or delegated roles, or if
they lose the rule to stop and route through project-manager when it is active
and no PM routing context or PM Context Packet was provided.

Quality risks:

- treating guidance metadata as automatic dependency or routing behavior
- overwriting project-owned workflow guidance overrides
- losing active role guidance edits during role or workflow updates
- resetting more guidance than the user targeted
- making `get-guidance` load broad or unrelated instruction context
- routing project-manager startup through `get-guidance` instead of the active
  project-manager guidance files
- lifecycle skills becoming a default direct entrypoint again when the active
  project-manager role should route meaningful project work first

Targeted checks:

```bash
node --test tests/guidance.test.mjs
node --test tests/skill-instructions.test.mjs
node --test tests/roles.test.mjs
```

## Workflows And Init

Tests in `tests/workflow.test.mjs` and `tests/init.test.mjs` cover default
project initialization, workflow docs, managed `AGENTS.md` block,
workflow-owned skills and roles, local workflow source precedence, bundled
workflow prompt selection, single-active-workflow refusal, workflow diff/update,
removal of deleted workflow-owned roles, uninstall after drift checks,
preserving project-owned `AGENTS.md` text, init idempotence, and init refusal
when local managed files are edited.

Quality risks:

- installing a second active workflow
- overwriting workflow docs or active assets with local edits
- removing standalone default skills during workflow uninstall
- treating `_docs` or root `AGENTS.md` as fully package-owned
- skipping preflight during `aix init`

Targeted checks:

```bash
node --test tests/init.test.mjs
node --test tests/workflow.test.mjs
```

## Templates

Tests in `tests/templates.test.mjs` cover template rendering fixtures,
workflow template discovery, supported placeholder syntax, missing section
references, unsupported syntax rejection, list/publish/diff/reset behavior,
published override guardrails, targeted publish refusal, reset preserving
unrelated files, cleanup of empty template directories, and missing workflow or
unknown template errors.

Quality risks:

- workflow templates accepting unsupported logic syntax
- partial template publishing creating hard-to-reason-about state
- overwriting locally edited published templates
- reset deleting unrelated project-owned template files

Targeted check:

```bash
node --test tests/templates.test.mjs
```

## Status And Verify

Tests in `tests/status.test.mjs` and `tests/verify.test.mjs` cover
uninitialized workspace output, workflow/source/skill/role status groups,
local drift reporting without mutation, unavailable update checks, color
handling, verify pass/fail output, package and active hash drift, alias
mismatches, and manifest/lockfile mismatch issues.

Quality risks:

- status mutating state while checking updates
- hiding drift or unavailable source resolution
- verify passing when package or active files changed

Targeted checks:

```bash
node --test tests/status.test.mjs tests/verify.test.mjs
```

## Workflow Instruction Contracts

Tests in `tests/skill-instructions.test.mjs` lock down shipped workflow skill
contracts: plan lifecycle routing, role collaboration, task execution,
phase/plan execution, work verification, docs refresh, plan completion gates,
security review, and completion checklist expectations.

Quality risks:

- workflow skill instructions drifting from lifecycle gates
- plan completion bypassing human validation
- missing security review or completion checklist sections
- renamed skills or roles leaving stale instruction references

Targeted check:

```bash
node --test tests/skill-instructions.test.mjs
```
