# Codex host dogfooding prompts

Use these prompts from a Codex CLI or app session after the project-manager
workflow is active. They are intentionally bounded so each prompt exercises one
host boundary without mixing unrelated product work.

## Read-only delegation

> Inspect the current package-management implementation and report the main
> ownership boundaries. Do not edit files, create artifacts, install anything,
> or run mutating commands. Return the role selected, delegation ID, subagent
> ID, status, evidence, and remaining risks.

## Implementation delegation

> Implement the smallest approved change for the active task. Work only in the
> assigned isolated workspace and declared paths. Do not modify `_docs/kb`.
> Return the delegation ID, subagent ID, files changed, tests run, and any
> integration concerns.

## Verification delegation

> Verify the completed implementation against its acceptance criteria. Do not
> edit files. Report commands, results, evidence, and unresolved gaps using the
> delegation protocol.

## Failure and recovery

> Inspect the incomplete delegation state, explain what failed, and propose the
> smallest safe recovery. Do not delete delegation data, retry destructive
> work, or edit project files until the PM has approved the recovery path.

## Completed-result inspection

> Retrieve the completed worker result for the current delegation and summarize
> its durable evidence separately from transient runtime details. Do not rerun
> the work or modify files.
