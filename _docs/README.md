# Project documentation

This directory contains project-owned documentation for AI Extensions.

Use this file as the starting point when you need product intent, current
implemented knowledge, or implementation plan context. Workflow instructions
for agents live under `.agents/`; this directory records what this project is
building and why.

## Start here

- [Knowledge base](kb/README.md): current implemented project knowledge for
  the `aix` CLI, package-management model, workflows, bundled skills,
  requirements, architecture, security, quality, operations, and decisions.
- [Active plans](plans/): authorized implementation plans and execution
  records. Start with active plans before changing product behavior.
- [Backlog plans](plans/backlog/): approved or proposed work that has not been
  activated yet. Backlog plans do not authorize implementation on their own.
- [Completed plans](plans/completed/): archived implementation records. Read
  these when previous decisions, migrations, or regressions are relevant.

## Documentation roles

The knowledge base describes accepted current implemented behavior and
architecture. Update it when implementation changes durable product,
requirements, architecture, security, quality, operations, decisions, or
terminology knowledge.

The plan docs describe work in flight or work reserved for later. Active plans
should track task status, verification evidence, risks, and documentation
impact until the work is complete.

The top-level `AGENTS.md` file is the repo-specific entrypoint for coding
agents. The `.agents/` directory contains reusable workflow guidance and
workflow-owned skills. Keep project-specific decisions in `_docs/`, not in the
package-managed workflow files.
