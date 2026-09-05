# Source And Package Trust

## Source Trust Posture

AIX treats all extension sources as untrusted until a developer reviews and
installs them. A source can provide executable-looking scripts, instructions,
or prompts that influence an agent runtime. AIX records provenance and hashes;
it does not prove that source content is safe.

## Git Resolution Risk

AIX resolves Git-backed sources by shelling out to the local `git` binary with
argument arrays. Resolution may clone, fetch, update origin URLs, detach
checkout a resolved commit, and read source files from the configured source
path.

Security implications:

- The local Git binary is trusted by assumption.
- Network access and remote repository trust belong to Git/source resolution.
- Resolved commits are recorded after checkout, but commit signatures are not
  verified.
- Source cache contents are mutable resolver state, not accepted package state.
- Error messages can include Git command failure text.

## Source URL And Credential Posture

AIX stores source URLs, paths, refs, resolved commits, metadata, and hashes.
It does not intentionally store secrets. Source URLs should not embed
credentials because URLs may appear in:

- `aix.json`
- `aix.lock.json`
- source metadata under the cache root
- status output
- errors from source resolution

Use normal Git credential helpers or environment-level authentication outside
AIX when private repositories are needed.

## Package Acceptance

Source content becomes accepted package state only when AIX copies it into
`.agents/packages/` and records file hashes in `aix.lock.json`.

The package copy, not the Git cache, is the accepted local artifact. Later
diffs compare the package copy to a newly resolved source snapshot. Later
verify/status checks compare package and active files to lockfile hashes.

## Skill And Role Instruction Risk

Skills and roles are instructions consumed by agent runtimes. AIX validates
package shape, names, collisions, ownership, and hashes, but it does not
semantically sandbox instruction content.

Security-sensitive install review should look for:

- requests for secrets or credentials
- destructive shell commands
- broad filesystem access
- production or external-system actions
- hidden persistence
- unclear network use
- instructions that bypass repository workflow or human approval

The bundled `discover-skill` skill intentionally routes candidate installation
through review packets and normal `aix skills add` / `aix skill activate`
commands instead of writing `.agents` files directly.

## Workflow Trust

Workflows carry larger trust impact than standalone skills because they can
install docs, skills, roles, templates, and a managed root `AGENTS.md` block.
Workflow install/update therefore stages the package and preflights all owned
surfaces before replacing the final package.

Only one workflow can be active at a time. This reduces ambiguity about which
process contract owns workflow docs, skills, roles, templates, and managed
`AGENTS.md` guidance.

## Role Metadata Trust

Role front matter can include `skills` metadata. AIX treats that metadata as a
runtime hint only. It validates metadata shape but does not automatically
install referenced skills, which prevents role activation from silently
expanding the active skill set.

## Force Update Trust Boundary

Force update does not make package sources trusted. It preserves the prior
installation for review, resolves and installs current configured sources via
the normal update path, and reports provenance and hashes through the backup
and lockfile. It does not merge instructions or bypass ownership checks for
ambiguous paths, unmanaged `AGENTS.md` blocks, project-owned files, or foreign
`.claude/` and `.codex/` content.

## Current Non-Goals

- No package registry trust model.
- No signed package verification.
- No commit-signature verification.
- No source allowlist enforcement beyond configured/default sources.
- No semantic security scanner for skill, role, or workflow instructions.
- No sandbox for agent runtimes that consume active instructions.
