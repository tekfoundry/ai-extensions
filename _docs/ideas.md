# Ideas

## Approved prioritized ideas

None yet.

## In-flight ideas

1. **skill-author**
   - Summary: A standalone bundled skill for creating or improving AIX-compatible skills. It would generate `SKILL.md`, optional `README.md`, examples, safety notes, and tests or review checks when the repo supports them. This is a high-value standalone skill because AIX is about distributing skills, and making good skills is still too manual.
   - Difficulty: medium
   - Dependencies: None
   - Source links:
     - [Claude Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
     - [AIX bundled skills design](design/bundled-skills.md)
     - [brainstorming-skill implementation](../aix/skills/brainstorming-skill/SKILL.md)

2. **skill-review**
   - Summary: A standalone skill that reviews a skill package before install, update, or publication. It would check trigger clarity, unsafe instructions, missing README, bad source links, overbroad tool use, stale examples, and whether the skill should be standalone or workflow-owned.
   - Difficulty: low
   - Dependencies: None
   - Source links:
     - [discover-skill](../aix/skills/discover-skill/SKILL.md)
     - [Claude Skills progressive disclosure](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

3. **workflow-author**
   - Summary: A workflow-integrated skill for designing a new AIX workflow package. It would help create `workflow.json`, `AGENTS.append.md`, workflow docs, templates, workflow-owned skills, and install/update safety notes.
   - Difficulty: medium
   - Dependencies: skill-author
   - Source links:
     - [AIX workflow design](design/workflows.md)
     - [Claude Code subagents docs](https://code.claude.com/docs/en/sub-agents)
     - [Cursor Rules docs](https://prod.cursor.com/docs/rules)

4. **agent-instructions-audit**
   - Summary: A standalone skill that scans a repo's agent-facing instruction files for conflicts, stale guidance, missing build/test commands, and tool-specific drift across `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules`, and `.agents/`.
   - Difficulty: medium
   - Dependencies: None
   - Source links:
     - [GitHub Copilot repository instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions?tool=eclipse)
     - [Cursor Rules docs](https://prod.cursor.com/docs/rules)
     - [Gemini CLI custom commands](https://google-gemini.github.io/gemini-cli/docs/cli/custom-commands.html)

5. **workflow-health-check**
   - Summary: A workflow-integrated skill that reviews an installed workflow for lifecycle gaps: missing templates, unclear phase boundaries, weak verification, unpromoted design decisions, stale completed plans, or package-managed/project-owned boundary mistakes.
   - Difficulty: low
   - Dependencies: None
   - Source links:
     - [AIX workflow design](design/workflows.md)
     - [plan-complete](../aix/workflows/design-plan-execute/skills/plan-complete/SKILL.md)
     - [documentation-review](../aix/workflows/design-plan-execute/skills/documentation-review/SKILL.md)

6. **release-readiness-review**
   - Summary: A standalone or optional workflow skill that reviews whether a package is ready to release without owning the release itself. It would inspect versioning, changelog or release notes, package contents, install docs, smoke checks, and publish warnings. This avoids the project-specific `release-build` trap while still creating value.
   - Difficulty: medium
   - Dependencies: None
   - Source links:
     - [MVP release plan](plans/mvp-release.md)
     - [package smoke test](../tests/package-smoke.test.mjs)

7. **update-impact-review**
   - Summary: A workflow-integrated skill for reviewing `aix workflow diff`, `aix workflow update`, `aix skills diff`, and `aix skills update` output. It would summarize behavior changes, safety risks, local drift concerns, and recommended verification before accepting updates.
   - Difficulty: medium
   - Dependencies: workflow-external-skill-dependencies
   - Source links:
     - [workflow external skill dependencies plan](plans/backlog/workflow-external-skill-dependencies.md)
     - [AIX package management design](design/package-management.md)

8. **guardrail-design**
   - Summary: A standalone skill that helps teams design agent guardrails: what should be blocked, what should require approval, what should be checked after edits, and what belongs in hooks versus instructions. It could eventually inform AIX workflow templates or companion docs.
   - Difficulty: medium
   - Dependencies: None
   - Source links:
     - [Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide)
     - [OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/)

9. **marketing-docs-review**
   - Summary: A standalone skill that reviews README files, product pages, examples, install instructions, screenshots, and release notes for staleness or weak positioning. This is useful for AIX because the product concept is new and adoption depends on clear examples.
   - Difficulty: low
   - Dependencies: None
   - Source links:
     - [Top-level README](../README.md)
     - [AIX skills README](../aix/skills/README.md)

10. **handoff-map**
   - Summary: A workflow-integrated skill that maps when work should stay in the main agent, use a skill, spawn a subagent, or become a plan. It would help teams avoid turning every reusable behavior into the wrong abstraction.
   - Difficulty: medium
   - Dependencies: agent-instructions-audit
   - Source links:
     - [Claude steering methods blog](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
     - [Claude Code subagents docs](https://code.claude.com/docs/en/sub-agents)
     - [OpenAI Agents SDK handoffs](https://openai.github.io/openai-agents-js/guides/handoffs/)

11. **workflow-cli-commands**
   - Summary: Let installed workflows register project-local `aix` CLI command namespaces that expose workflow-specific operations. For example, an agile Kanban workflow could provide `aix kanban board` to render the current board, with possible future commands such as `aix kanban card add`, `aix kanban card move`, or `aix kanban status`. This would make workflows feel like installable development systems rather than only folders of instructions and skills.
   - Difficulty: medium
   - Dependencies: workflows
   - Notes:
     - Start with read-only or declarative commands, such as board/status rendering, before allowing mutating workflow commands.
     - Prefer namespaced commands like `aix kanban board` so multiple workflows can coexist without ambiguous top-level command collisions.
     - Command registration could come from a workflow-owned manifest that `aix help` and command dispatch can discover.
     - Mutating commands should preserve AIX safety rules: no silent overwrites, explicit collision handling, and clear previews where feasible.
   - Source links:
     - [AIX workflow design](design/workflows.md)
