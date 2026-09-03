# delegate-to-role

## Skill Summary

Selects an installed project role and prepares a bounded delegation prompt
while preserving parent-context ownership.

Installation:

```bash
aix init
```

This skill is workflow-owned. `aix init` installs the default
`design-plan-execute` workflow and activates this skill with it. To install the
workflow explicitly, run:

```bash
aix workflow install aix/workflows/design-plan-execute
```

Dependencies:

- Installed role files under `.agents/roles/`
- Repository instructions and active plan context when the task is plan-related
- Host support for native subagents when available

## How to use it

Here are example prompts that invoke this skill:

- "Use quality-engineer for this verification plan."
- "Delegate to documentation-specialist for the docs impact review."
- "Use technical-architect to review this design direction."

## When it is used

Use this skill when the developer explicitly asks to use or delegate to a named
role.

## What it does

The skill resolves the named role, stops on missing or ambiguous role requests,
and requires native subagent handoff for PM-routed work. Before dispatch, the
PM must inspect the complete host/tool registry, including deferred tools, and
confirm `native-worker-creation` and `correlated-results`. Unknown or
unavailable capabilities block parent-session fallback. Prompt-overlay remains
available only during bootstrap before PM activation or under an explicit
developer override. Delegated work must return evidence for parent review.
