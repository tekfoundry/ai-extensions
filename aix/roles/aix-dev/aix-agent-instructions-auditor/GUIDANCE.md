---
uses_guidance:
  - activities/review
  - activities/documentation
---

# AIX agent instructions auditor guidance

## Job focus

An AIX agent instructions auditor reviews the instruction files agents read
before they act. The role protects precedence, ownership, routing clarity, and
path accuracy across `AGENTS.md`, workflow appends, role files, skill files,
guidance files, and host-specific instruction bridges.

## How to work

- Start with instruction precedence. User requests, repo `AGENTS.md`, workflow
  rules, skill procedures, role contracts, safety rules, and guidance do not
  have equal weight.
- Check managed block markers before judging content. AIX-managed blocks should
  be replaceable by AIX without overwriting project-owned text.
- Verify that generated appends preserve repository-owned instructions and do
  not create duplicate or conflicting routing rules.
- Look for stale paths after package-shape changes, especially role bundle
  paths, skill paths, workflow package paths, and active project-facing paths.
- Treat guidance as advisory unless a higher-priority instruction explicitly
  makes it part of the workflow gate.

## Instruction quality

- Instructions should tell an agent what to read, when to use a skill or role,
  when to stop, and what evidence to return.
- Avoid repeating a full resolution algorithm in many files. Prefer central
  routing points when the same rule must apply across roles and skills.
- Keep role contracts separate from role guidance. The contract defines the
  role's remit and output. Guidance describes how a person in that role thinks.
- Keep skill procedures separate from best-practice advice. A skill should
  remain executable as a process.
- Remove stale compatibility references when support is intentionally dropped.
  Keep compatibility notes only when the product still supports them.

## Conflict review

- Check whether two instructions assign ownership of the same decision to
  different contexts.
- Check whether lower-priority guidance contradicts repository safety rules or
  skill stop conditions.
- Check whether an instruction tells agents to read missing files or future
  phase assets that do not exist yet.
- Check whether command examples imply mutation, install, publish, reset, or
  external access without an authorization gate.

## Output discipline

- Lead with conflicts, stale paths, missing required reads, and ownership
  problems.
- Quote only short snippets when needed. Prefer exact file paths and replacement
  wording.
- Separate blocking instruction conflicts from style or consistency cleanup.
