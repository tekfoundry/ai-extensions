# GitHub Skill Discovery Helper

## Status

💤 Backlog

This backlog plan is fully approved for later activation. It does not authorize
implementation until a later explicit `plan-activate` request.

## Context

AI Extensions already manages Git-backed skill sources, discovers valid
`SKILL.md` folders from configured sources, activates selected skills into
`.agents/skills`, records exact resolved state in `aix.lock.json`, and protects
local edits before overwrites.

The current discovery path assumes the user already knows a source collection
or GitHub tree URL. A user who only knows what kind of help they want, such as
"I'd like to add a skill that would review accessibility issues," still needs
to leave the CLI, search GitHub manually, judge likely matches, add the source,
list its skills, and activate one.

This plan adds a default bundled `aix` skill that helps an agent perform that
GitHub discovery step conversationally. The skill should turn a user's natural
language need into focused GitHub searches, enumerate the best matching
candidate skills, and guide the user toward either installing one selected
candidate through existing `aix` commands or exiting without installing
anything.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/overview.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
- `_docs/design/workflows.md`
- `_docs/design/bundled-skills.md`
- `_docs/plans/mvp-release.md`
- `_docs/plans/backlog/workflow-external-skill-dependencies.md`

## High-Level Goal (status: accepted)

Create a new default bundled skill named `discover-skill` for AI Extensions
that helps users discover installable skills from a natural language request.

The user experience should support prompts like:

```text
I'd like to add a skill that would help write accessibility-focused code reviews.
```

The skill should help the agent search known/default skill sources and GitHub
for candidate skill directories, inspect likely `SKILL.md` files, rank the top
one to five matches, and present them as a numbered list with concise reasons.
The user can select a number to install that skill through AI Extensions, or
choose to quit without installing.

This matters because skill discovery should feel like package discovery: the
user should be able to describe the capability they want and get a small,
credible set of options instead of needing to know repository URLs and paths in
advance.

After an explicit user selection, the agent should run the needed existing
`aix` commands and show the command being run, such as
`running aix skills add <url>`.

## Design Intent (status: accepted)

Add a project-agnostic default bundled skill named `discover-skill` to the
`aix` skill source. The skill should live under `aix/skills/discover-skill` and
be installed by default. It should not be owned by the active workflow, and it
should remain available even if the user later uninstalls the workflow. Its
output should guide an agent through discovery and installation using existing
`aix` commands and safety checks.

The repository currently contains duplicated skills under both `aix/skills` and
`aix/workflows/design-plan-execute/skills`. This appears to be legacy cleanup
work rather than the intended long-term ownership model. Existing workflow
skills should belong to the `design-plan-execute` workflow, while this new
discovery helper belongs to the default `aix` skill source.

Skills found through this discovery process should be installed as ordinary
user-requested skills. They should not be added to the active workflow or made
workflow-owned by default. If a discovered skill comes from a source that is not
already configured, the install path should add that source and then activate
the selected skill through the normal `aix` skill lifecycle. Promoting an
external skill into a workflow is intentionally reserved for a future feature.

The skill should:

- accept a natural language prompt to discover a new skill
- clarify the purpose of the desired skill with the user before searching
- once the purpose is clear, run the discovery process across configured
  sources and broader GitHub results
- prefer candidate results with inspectable `SKILL.md` content
- rank and display the top one to five candidates
- present results as an enumerated list with skill name, summary, and a link
  for the user to review the skill code
- prompt the user to review the candidates and use an explicit command such as
  `install 2` to install the selected skill
- install only after that explicit numbered selection
- show each command before running it, such as `running aix skills add <url>`
- use existing `aix skills add` and `aix skill activate` behavior rather than
  writing `.agents/`, `aix.json`, or `aix.lock.json` directly

The skill should be conservative about trust. It should not claim a skill is
safe merely because it was found on GitHub. Candidate presentation should
distinguish relevance from trust and should encourage inspection when the
source is unfamiliar. It should avoid installing from uninspectable results or
results where a valid `SKILL.md` cannot be confirmed. Reviews of unfamiliar
sources should be cautious and should make clear that relevance is not the same
as trust.

The first implementation should be instructions-only unless a later phase
shows that a small helper command is needed. This keeps the MVP aligned with
the current product boundary: Git-backed sources are managed by `aix`, while
agent skills can orchestrate web search, review, and user confirmation.

To make discovery practical and reduce exposure to arbitrary internet results,
AI Extensions should maintain a registry-style source index: a growing file of
known skill source URLs that discovery can search before or instead of broad
web search. This file is not a package registry and should not own install
state, versions, publishing, or trust guarantees. It is a curated discovery
input that helps the agent focus on known skill collections, search more
quickly, and avoid presenting random web results when better indexed sources
exist. The discovery process should search configured sources, the known-source
index, and broader GitHub or internet results only when needed.

"Top matching skills" means the best available installable, inspectable, and
relevant skills after filtering out weak or unsafe candidates. The discovery
process should not pad the list to five if fewer than five credible candidates
exist.

Candidates must pass these hard filters before ranking:

- the skill has inspectable instructions, preferably a valid `SKILL.md`
- the source root and skill path can be determined
- the candidate appears related to the clarified user request
- the candidate does not appear obviously unsafe, such as asking for secrets,
  broad system access, destructive actions, credential handling, or unclear
  external actions without safeguards

Ranking should favor:

1. direct purpose match against the clarified user need
2. valid skill evidence from `name`, `description`, and instructions
3. installability through `aix skills add` and `aix skill activate`
4. source confidence, preferring configured sources, then known-source index
   entries, then broader GitHub or internet results
5. instruction quality: specific, actionable, scoped, and clear
6. safety posture and absence of risky instructions
7. maintenance signals such as recent commits, clear ownership, stars, and
   activity as tie breakers only

## Non-Goals (status: accepted)

- No full package registry with publishing or version ownership.
- No package publishing or marketplace behavior.
- No automatic installation of the highest-ranked result.
- No bypass of `aix skills add`, `aix skills list`, or `aix skill activate`.
- No direct edits to `aix.json`, `aix.lock.json`, `.agents/packages`, or
  `.agents/skills` from the skill.
- No automatic trust guarantee just because a source is listed in the
  known-source index.
- No scoring based on popularity alone.
- No padding weak results just to reach five candidates.
- No workflow promotion of discovered skills.
- No new `aix skills search` CLI command unless implementation proves the
  skill alone is insufficient.
- No guarantee that a GitHub result is secure, maintained, or compatible beyond
  the evidence the skill can inspect.

## Boundaries And Invariants (status: accepted)

- The discovery helper is a default bundled `aix` skill under `aix/skills`, not
  a workflow-owned skill under `aix/workflows/design-plan-execute/skills`.
- The discovery helper should be installed by default and remain available even
  if the user uninstalls the active workflow.
- Discovered skills are installed as ordinary user-requested skills, not
  workflow-owned skills.
- Clarification, source-index search, GitHub search, internet search, and
  candidate inspection are read-only until the user explicitly enters an
  `install #` selection.
- Installation remains safety-sensitive and must route through existing
  `aix skills add` and `aix skill activate` commands.
- Existing source normalization, lockfile writes, activation, collision
  handling, aliasing, dependency inference, and local drift protection stay
  authoritative.
- The agent must show each command before running it.
- The known-source index is discovery input only. It does not install, lock,
  version, certify, or trust a source.
- Candidate output must include review links and a quit path directly alongside
  numbered options.
- Candidate output must not overwhelm the user; show up to five credible
  options.
- Candidate ranking should follow the accepted ranking criteria in Design
  Intent.
- If the search cannot confidently identify valid installable skills, the
  skill should say so and avoid presenting weak matches as install-ready.

## Implementation Phases

### Phase 1: Known Skill Source Index (status: accepted)

Goal: create the initial repository of known skill source URLs that discovery
can use before falling back to broader GitHub or internet search.

Tasks:

- ⬜️ Decide where the known-source index lives in the repository and installed
      package.
- ⬜️ Define the known-source index file shape, including source URL, optional
      label, optional source path, optional notes, and any metadata needed for
      discovery.
- ⬜️ Define the review bar for adding source URLs to the index.
- ⬜️ Add the known-source index file in the accepted location.
- ⬜️ Seed the known-source index with the configured/default skill source URLs.
- ⬜️ Document that source-index entries are discovery hints, not trust
      guarantees.
- ⬜️ Ensure the known-source index can grow without changing install or
      lockfile behavior.

Verification:

- Static review of the known-source index shape and seed entries.
- Confirm source-index entries can be normalized into existing `aix skills add`
  source URLs.
- Plan review against `_docs/design/package-management.md` and
  `_docs/design/bundled-skills.md`.

### Phase 2: Skill Contract And Prompt Design (status: accepted)

Goal: define the user-facing workflow and acceptance criteria for the discovery
skill before adding it to the default bundled `aix` skill source.

Tasks:

- ⬜️ Use `discover-skill` as the bundled skill name and active name.
- ⬜️ Define the expected user input shape for natural language skill requests.
- ⬜️ Define the clarification questions and stopping point before discovery
      begins.
- ⬜️ Define the candidate evidence the skill must collect before presenting a
      result.
- ⬜️ Encode the accepted candidate hard filters, ranking criteria, and tie
      breakers.
- ⬜️ Define the candidate review, `install #`, and quit behavior.
- ⬜️ Define the exact handoff from selected candidate to existing `aix`
      commands.
- ⬜️ Decide whether aliases are offered during the first version or deferred to
      normal `aix skill activate` behavior.

Verification:

- Plan review against `_docs/design/package-management.md` and
  `_docs/design/cli.md`.
- Manual walkthrough with at least two example user requests and expected
  candidate output shape.

### Phase 3: Bundled Skill Authoring (status: accepted)

Goal: add the new default bundled skill instructions to the `aix` skill source.

Tasks:

- ⬜️ Add the new skill under `aix/skills` with a valid
      `SKILL.md`.
- ⬜️ Include instructions for clarifying user intent before searching.
- ⬜️ Include instructions for searching configured sources, the known-source
      index, and broader GitHub or internet results when needed.
- ⬜️ Include instructions for validating `SKILL.md` evidence before ranking a
      candidate.
- ⬜️ Include instructions for presenting up to five numbered candidates with
      skill name, summary, and review link.
- ⬜️ Include instructions for accepting `install #` only after the candidate
      list is shown.
- ⬜️ Include instructions for installing a selected candidate through `aix`
      commands only, showing each command before running it.
- ⬜️ Include trust, inspection, and uncertainty language for unfamiliar
      sources.
- ⬜️ Keep the skill project-agnostic and free of application-specific policy.

Verification:

- Static review of the new `SKILL.md` front matter and instructions.
- Confirm the skill does not instruct agents to bypass `aix` safety checks.
- Confirm the skill can be followed without relying on repo-specific commands.

### Phase 4: Default Install And Packaging Exposure (status: accepted)

Goal: make the new skill part of the default `aix` skill installation without
tying it to workflow ownership.

Tasks:

- ⬜️ Ensure `aix init` installs and activates the new default bundled skill.
- ⬜️ Ensure the known-source index is packaged or otherwise available wherever
      the discovery helper expects to read it.
- ⬜️ Update bundled skill documentation so the new discovery helper appears
      with the other default bundled `aix` skills.
- ⬜️ Update packaging tests or fixtures that enumerate default bundled `aix`
      skills.
- ⬜️ Verify `aix init` exposes the new skill through the normal active skill
      path and that workflow uninstall does not remove it.

Verification:

- Targeted bundled-skill discovery or packaging tests.
- Targeted init tests for default bundled skill activation.
- Workflow uninstall test or fixture review confirming the helper is not
  workflow-owned.
- `npm run build`.

### Phase 5: Discovery Flow Validation (status: accepted)

Goal: validate the skill against realistic GitHub discovery scenarios without
turning it into an automated registry.

Tasks:

- ⬜️ Test the skill instructions with a request that requires clarification
      before discovery begins.
- ⬜️ Test the skill instructions with a request that matches a configured
      source skill.
- ⬜️ Test the skill instructions with a request that matches a known-source
      index entry.
- ⬜️ Test the skill instructions with a request that requires broader GitHub or
      internet search.
- ⬜️ Test the skill instructions with a request that matches a nested skill
      path.
- ⬜️ Test the skill instructions with weak search results where no installable
      skill should be recommended.
- ⬜️ Record examples of good candidate summaries, review links, `install #`,
      command preview, and quit behavior.

Verification:

- Manual transcript-style walkthroughs recorded in the plan or test fixtures.
- Confirm every install path still routes through `aix skills add` and
  `aix skill activate`.

### Phase 6: Review, Documentation, And Promotion (status: accepted)

Goal: close the implementation with maintainability review and durable docs.

Tasks:

- ⬜️ Run the maintainability review gate for changed production files if any
      production code changes were needed.
- ⬜️ Update design docs if the accepted behavior changes the stable workflow
      skill set or discovery model.
- ⬜️ Update user-facing docs or examples if the README lists bundled skills or
      common discovery workflows.
- ⬜️ Record any deferred follow-up, such as a future CLI-level `aix skills
      search` command, external skill workflow promotion, richer source-index
      governance, or richer trust metadata.

Verification:

- Documentation review against `_docs/design/bundled-skills.md`,
  `_docs/design/workflows.md`, and `_docs/design/package-management.md`.
- `npm test` when production code or workflow packaging behavior changes.
- `git diff --check`.

## Open Questions / Decisions

- Should the first version offer aliases during activation, or let the normal
  `aix skill activate` flow handle aliases separately?
- Where should the known-source index live in the repository and installed
  package?
- What review bar should a source URL meet before it is added to the
  known-source index?
- Should the install step add the whole discovered source under a user-visible
  alias derived from the repository, or ask the user to choose a source alias
  before running `aix skills add`?

## Risks

- GitHub search results can be noisy, stale, or unavailable.
- Broader internet search can be slow, noisy, or unavailable.
- The known-source index can become stale, biased, or too small to find good
  matches unless it has a simple maintenance path.
- A source listed in the known-source index may still contain unsafe or
  low-quality skills.
- A valid-looking `SKILL.md` does not prove quality, safety, or maintenance.
- Installing from unfamiliar repositories can introduce untrusted agent
  instructions into a project.
- Candidate source paths may be hard to normalize when repositories use unusual
  layouts.
- The skill may need web access, and some agent environments may not have a
  browser or GitHub search capability available.
- Ranking criteria or summaries can overvalue popularity, known-source
  familiarity, or presentation quality and bury a more relevant skill.
- Ambiguous user requests could lead to poor matches unless the skill asks a
  clarifying question.

## Lessons To Carry Forward

- Keep discovery advisory and installation explicit.
- Reuse the existing package-management safety model instead of creating a
  second installation path.
- Treat candidate relevance, installability, and trust as separate concepts in
  user-facing output.
- Treat source-index membership as a discovery signal, not a trust guarantee.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Review the codebase to ensure the code is maintainable and clean; refactor if needed.
- ⬜️ Promote accepted durable behavior into design docs using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.

## Promotion To Design

If accepted and implemented, promote the stable behavior into:

- `_docs/design/bundled-skills.md` for the new default bundled skill and the
  cleanup of legacy duplicated skill ownership.
- `_docs/design/workflows.md` if workflow skill ownership docs need to clarify
  that this helper is not workflow-owned.
- `_docs/design/package-management.md` for the known-source index and any
  durable source-discovery behavior beyond skill instructions.
