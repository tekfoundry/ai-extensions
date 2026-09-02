# Claude host dogfooding prompts

Use these prompts from a Claude Code CLI or app session after the
project-manager workflow is active. They exercise the same host-neutral PM
contract as the Codex prompts.

## Read-only delegation

> Please perform a read-only review of the current package-management
> boundaries. Let the active PM workflow select the appropriate specialists.
> Do not edit files, create artifacts, install anything, or run mutating
> commands. Return each role's findings separately with its delegation and
> subagent identifiers.

## Implementation delegation

> Implement the smallest approved change for the active task in the assigned
> isolated workspace and declared paths only. Do not modify `_docs/kb`.
> Return the delegation ID, subagent ID, files changed, tests run, and any
> integration concerns.

## Verification delegation

> Verify the completed implementation against its acceptance criteria without
> editing files. Report commands, results, evidence, unresolved gaps, and
> residual risk through the delegation protocol.

## Failure and recovery

> Inspect the incomplete delegation state and explain the smallest safe recovery
> path. Do not delete delegation data, retry destructive work, or edit project
> files until the PM approves the recovery.

## Completed-result inspection

> Retrieve and summarize the completed worker result for the current delegation.
> Separate durable evidence from transient runtime details. Do not rerun the
> work or modify files.
