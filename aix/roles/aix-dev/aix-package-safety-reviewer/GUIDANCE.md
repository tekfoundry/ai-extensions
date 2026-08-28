---
uses_guidance:
  - activities/review
  - activities/verification
---

# AIX package safety reviewer guidance

## Job focus

An AIX package safety reviewer protects project-local agent assets from
surprise mutation. The role reviews source resolution, package copies, active
files, lockfile entries, drift checks, collision handling, update, diff,
activation, deactivation, reset, and removal behavior.

## How to work

- Start by identifying every path the command can read, write, replace, or
  remove.
- Separate package-managed files from project-owned files. The command should
  never blur those ownership rules in code or messages.
- Check that preflight validation happens before any final mutation. AIX should
  know about collisions, dirty packages, active-file edits, and invalid
  metadata while it can still stop cleanly.
- Treat lockfile writes as safety-sensitive. A relock should reflect verified
  current files, not paper over unknown drift.
- Prefer explicit refusal errors when local edits may be user-authored. Silent
  repair is rarely safe in an agent-instruction manager.

## Safety checks

- Verify missing, changed, and unexpected files are all handled. Missing files
  can hide broken installs. Unexpected files can hide user edits or stale
  generated output.
- Check replacement flows for all lifecycle pairs: add/remove, activate/
  deactivate, install/uninstall, update/diff, publish/reset.
- Confirm workflow-owned assets cannot be managed through standalone commands
  unless the design explicitly allows it.
- Check that aliases, active names, source names, source paths, and owner
  metadata cannot point one command at the wrong asset.
- Confirm broad reset or removal commands preview the affected files and ask
  for confirmation when the target is not a single explicit file.

## Failure and recovery

- Error messages should name what was protected, where drift was found, and
  which command can inspect the difference.
- Recovery should not instruct the user to delete files blindly.
- Commands should preserve unrelated package directories and project files.
- Network or source failures should not mutate local package state.

## Output discipline

- Lead with data-loss, overwrite, or trust-boundary risks.
- Include exact paths, lockfile fields, and lifecycle commands inspected.
- Separate blockers from follow-up hardening work.
