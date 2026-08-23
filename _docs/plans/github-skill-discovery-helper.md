# GitHub Skill Discovery Helper

## Status

🟨 Active

This plan was activated by user request on 2026-08-23. It is now authorized
for implementation as an active plan.

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
  sources and `known-sources.json`; ask before broadening to unreviewed GitHub
  or internet results
- prefer candidate results with inspectable `SKILL.md` content
- rank and display the top one to five candidates
- present results as an enumerated list with skill name, summary, and a link
  for the user to review the skill code
- prompt the user to review the candidates and use an explicit command such as
  `install 2` to start install review for the selected skill
- after `install #`, provide a list of files the user should review, an
  initial skill assessment, and the exact commands that would run
- install only after the user confirms the install review with an explicit
  command such as `confirm install 2`
- show each command before running it, such as `running aix skills add <url>`
- use existing `aix skills add` and `aix skill activate` behavior rather than
  writing `.agents/`, `aix.json`, or `aix.lock.json` directly

The skill should be conservative about trust. It should not claim a skill is
safe merely because it was found on GitHub. Candidate presentation should
distinguish relevance from trust and should encourage inspection when the
source is unfamiliar. It should avoid installing from uninspectable results or
results where a valid `SKILL.md` cannot be confirmed. Reviews of unfamiliar
sources should be cautious and should make clear that relevance is not the same
as trust. Candidates from outside configured sources and `known-sources.json`
should be labeled as unreviewed sources.

The first implementation should be instructions-only unless a later phase
shows that a small helper command is needed. This keeps the MVP aligned with
the current product boundary: Git-backed sources are managed by `aix`, while
agent skills can orchestrate web search, review, and user confirmation.

To make discovery practical and reduce exposure to arbitrary internet results,
AI Extensions should maintain a small source index: a user-editable
`known-sources.json` file stored beside the bundled discovery skill at
`aix/skills/discover-skill/known-sources.json`. The file should be a simple
list of source URLs so users can add their own sources without learning a
dense schema. Review summaries and unsafe-skill notes belong in the curation
process and plan history, not in the shipped index unless a later need proves
that metadata belongs in the package.

The source index is not a package registry and should not own install state,
versions, publishing, or trust guarantees. It is a curated discovery input
that helps the agent focus on known skill collections, search more quickly,
and avoid presenting random web results when better indexed sources exist. The
discovery process should search configured sources and the known-source index
by default. If those do not produce enough credible candidates, the skill
should ask before broadening to unreviewed GitHub or internet results.

Sources should be added to the index through a human approval flow. The agent
searches the internet for popular repositories that contain multiple skills,
reviews each source, summarizes what it found, flags any skills that appear
unsafe, and presents an enumerated list of source candidates with URLs for
inspection. The user then approves sources by number, such as `approve 1` or
`approve 3,6,9`. Only approved sources are added to the known-source index.

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
   entries, then user-approved broader GitHub or internet results
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
- The known-source index is a simple user-editable URL list stored at
  `aix/skills/discover-skill/known-sources.json`.
- The known-source index is discovery input only. It does not install, lock,
  version, certify, or trust a source.
- Source reviews, summaries, and unsafe-skill flags are used for human
  approval before adding URLs. They are not required metadata in the shipped
  index.
- Candidate output must include review links and a quit path directly alongside
  numbered options.
- Candidate output must not overwhelm the user; show up to five credible
  options.
- Candidate ranking should follow the accepted ranking criteria in Design
  Intent.
- If the search cannot confidently identify valid installable skills, the
  skill should say so and avoid presenting weak matches as install-ready.

## Implementation Phases

### Phase 1: Known Skill Source Index (status: completed)

Goal: create the initial repository of known skill source URLs that discovery
can use before falling back to broader GitHub or internet search.

Tasks:

- ✅ Decide where the known-source index lives in the repository and installed
      package: `aix/skills/discover-skill/known-sources.json`.
- ✅ Define the known-source index file shape as a simple JSON list of source
      URLs.
- ✅ Define the review bar for adding source URLs to the index: internet
      search, source review, summary, unsafe-skill flagging, enumerated
      candidate list, and explicit user approval by number before adding URLs.
- ✅ Add the known-source index file in the accepted location.
- ✅ Seed the known-source index with the configured/default skill source URLs.
- ✅ Document that source-index entries are discovery hints, not trust
      guarantees.
- ✅ Ensure the known-source index can grow without changing install or
      lockfile behavior.

Completion evidence:

- 2026-08-23: User accepted placing the index beside the bundled discovery
  skill at `aix/skills/discover-skill/known-sources.json`. The index should be
  a simple JSON list of source URLs. The curation process should search for
  popular multi-skill sources, review each source, summarize findings, flag
  unsafe skills, present an enumerated list with URLs, and add only sources
  explicitly approved by number.
- 2026-08-23: User approved the first two known source entries after prior
  review: `https://github.com/mattpocock/skills/tree/main/skills` and
  `https://github.com/cursor/plugins/tree/main/pstack/skills`. Added those
  URLs to `aix/skills/discover-skill/known-sources.json`.
- 2026-08-23: User approved source candidate 4,
  `https://github.com/shawn-sandy/skills/tree/main/skills`, after review.
  Added the URL to `aix/skills/discover-skill/known-sources.json`.
- 2026-08-23: User approved source candidate 5,
  `https://github.com/Far-200/think-before-code/tree/main/skills`, after
  review. Added the URL to
  `aix/skills/discover-skill/known-sources.json`.
- 2026-08-23: User approved the filtered software-development source
  candidates `https://github.com/addyosmani/agent-skills/tree/main/skills`,
  `https://github.com/obra/superpowers/tree/main/skills`, and
  `https://github.com/getsentry/skills/tree/main/skills`. User also refined
  the curation filter to exclude sources focused on one technology or vendor,
  such as AWS, Azure, or Claude-specific collections.
- 2026-08-23: User approved five additional broad software-development
  sources after filtering out already-approved, single-vendor, and
  single-technology sources:
  `https://github.com/arjunprabhulal/agent-skills/tree/main/skills`,
  `https://github.com/owainlewis/blueprint/tree/main/skills`,
  `https://github.com/danielcherubini/skills/tree/main/skills`,
  `https://github.com/ykeezy/skills/tree/main/.claude/skills`, and
  `https://github.com/sbrudz/agent-skills/tree/main/skills`.
- 2026-08-23: Added
  `aix/skills/discover-skill/README.md` to document that source-index entries
  are discovery hints, not trust guarantees or install records. The README
  keeps the index growth rule simple: add only GitHub tree URL strings after
  source review and human approval, and keep review metadata out of
  `known-sources.json`.

Verification:

- Static review of the known-source index shape and seed entries.
- Confirm source-index entries can be normalized into existing `aix skills add`
  source URLs.
- Plan review against `_docs/design/package-management.md` and
  `_docs/design/bundled-skills.md`.

Verification evidence:

- 2026-08-23: Parsed
  `aix/skills/discover-skill/known-sources.json` with Node and confirmed it is
  a JSON array of two strings.
- 2026-08-23: Ran `npm run build`.
- 2026-08-23: Parsed both approved GitHub tree URLs through
  `parseSourceDefinition`; they normalized to Git URLs, `main` refs, and
  source paths `skills` and `pstack/skills`.
- 2026-08-23: Ran `git diff --check` for the touched plan and index file.
- 2026-08-23: Confirmed the index remains a JSON array of URL strings and all
  12 entries normalize through the existing `parseSourceDefinition` path
  without adding install or lockfile behavior.
- 2026-08-23: Ran `npm run build`.
- 2026-08-23: Ran `git diff --check` for the touched plan, index, and README
  files.

### Phase 2: Skill Contract And Prompt Design (status: completed)

Goal: define the user-facing workflow and acceptance criteria for the discovery
skill before adding it to the default bundled `aix` skill source.

Tasks:

- ✅ Use `discover-skill` as the bundled skill name and active name.
- ✅ Define the expected user input shape for natural language skill requests.
- ✅ Define the clarification questions and stopping point before discovery
      begins.
- ✅ Define the candidate evidence the skill must collect before presenting a
      result.
- ✅ Encode the accepted candidate hard filters, ranking criteria, and tie
      breakers.
- ✅ Define the candidate review, `install #`, and quit behavior.
- ✅ Define the exact handoff from selected candidate to existing `aix`
      commands.
- ✅ Decide whether aliases are offered during the first version or deferred to
      normal `aix skill activate` behavior.

Prompt contract:

- The bundled skill name and default active name are both `discover-skill`.
- User input may be a natural-language request such as "find a skill for
  accessibility review", "add a skill for TDD", "I need help reviewing
  security issues", or "find a skill that helps write better React code".
- The skill should ask a clarification question only when the request is too
  broad, risky, or ambiguous to search usefully. If the request names a clear
  software-development capability, discovery can begin without extra
  questioning.
- Discovery should stay focused on software-development-relevant skills. The
  first version should avoid sources or candidates that are primarily office
  productivity, personal automation, marketing, therapy-adjacent, or focused on
  one vendor or technology unless the user's clarified request asks for that
  technology.
- Before presenting a candidate, collect the source URL, normalized source
  path, skill path, confirmed `SKILL.md` presence, skill `name`, skill
  `description`, a short relevance reason, a review link, and any unsafe flags.
- Hard filters remain: inspectable skill instructions, determinable source
  root and skill path, relevance to the clarified request, and no obvious
  unsafe instructions such as secret handling, destructive actions, broad
  system access, credential handling, or unclear external actions without
  safeguards.
- Ranking should follow the accepted order in Design Intent: direct purpose
  match, valid skill evidence, installability through `aix`, source confidence,
  instruction quality, safety posture, then maintenance signals.
- Candidate output should show up to five credible results as a numbered list.
  Each result should include skill name, source, summary, relevance reason,
  review link, and unsafe flags when present. Do not pad weak results to reach
  five.
- Present `q - Quit` directly with the numbered options.
- Installation review requires an explicit `install #` command after the
  candidate list is shown. A bare number is not enough.
- After `install #`, show the files the user should review, provide an initial
  assessment, preview the exact commands, and wait for `confirm install #`
  before running any install command.
- For a selected candidate from a source that is not configured, show and run
  `aix skills add <source-url> [source-alias]`, then show and run
  `aix skill activate <source>/<skill-path>`.
- For a selected candidate from an already configured source, show and run only
  `aix skill activate <source>/<skill-path>`.
- The first version should not offer aliases during the guided install flow.
  It may mention that users can later use normal `aix skill activate` behavior
  with an alias when needed.
- Use the bundled skill README convention: `README.md` is the human-facing
  quick reference and maintenance guide, while `SKILL.md` is the agent-facing
  runtime procedure.

Manual walkthroughs:

1. Clear request:
   - User: "Find a skill for accessibility-focused code reviews."
   - Expected behavior: search configured sources and `known-sources.json`
     first; inspect candidate `SKILL.md` files; present one to five candidates
     with review links and any unsafe flags; show `q - Quit`; wait for
     `install #` before showing the install review packet, then wait for
     `confirm install #` before running any `aix` command.
   - Expected candidate shape: `1. accessibility-review` with source URL,
     skill path, a short reason such as "direct WCAG/code-review match", a
     review link to `SKILL.md`, and `Unsafe flags: none observed` or the
     specific flags found.
2. Ambiguous request:
   - User: "Find a skill for deployment."
   - Expected behavior: ask one clarification question before searching,
     because deployment can mean CI checks, release planning, cloud
     provisioning, container deployment, rollback practice, or production
     operations.
   - Expected stopping point: do not search or install until the user clarifies
     the intended development context and risk level.

Completion evidence:

- 2026-08-23: User accepted the Phase 2 decisions: `discover-skill` name,
  natural-language input, clarification only for broad or risky requests,
  candidate evidence requirements, `install #` review selection, exact `aix`
  command handoff after `confirm install #`, and alias deferral to normal
  activation behavior.
- 2026-08-23: During Phase 5 walkthroughs, user tightened the accepted
  discovery and install flow. Broader GitHub or internet search should ask for
  permission before leaving configured sources and `known-sources.json`.
  Installing a discovered skill should first show files to review and an
  initial assessment, then wait for user confirmation before commands run.
- 2026-08-23: Added the prompt contract and two manual walkthrough shapes to
  this phase for Phase 3 `SKILL.md` authoring.

Verification:

- Plan review against `_docs/design/package-management.md` and
  `_docs/design/cli.md`.
- Manual walkthrough with at least two example user requests and expected
  candidate output shape.

Verification evidence:

- 2026-08-23: Reviewed the prompt contract against
  `_docs/design/package-management.md` and `_docs/design/cli.md`; it routes
  all installation through `aix skills add` and `aix skill activate` and does
  not add a second install path.
- 2026-08-23: Added one clear-request walkthrough and one ambiguous-request
  walkthrough with expected candidate or clarification behavior.

### Phase 3: Bundled Skill Authoring (status: completed)

Goal: add the new default bundled skill instructions to the `aix` skill source.

Tasks:

- ✅ Add the new skill under `aix/skills` with a valid
      `SKILL.md`.
- ✅ Include instructions for clarifying user intent before searching.
- ✅ Include instructions for searching configured sources, the known-source
      index, and broader GitHub or internet results when needed.
- ✅ Include instructions for validating `SKILL.md` evidence before ranking a
      candidate.
- ✅ Include instructions for presenting up to five numbered candidates with
      skill name, summary, and review link.
- ✅ Include instructions for accepting `install #` only after the candidate
      list is shown.
- ✅ Include instructions for installing a selected candidate through `aix`
      commands only, showing each command before running it.
- ✅ Include trust, inspection, and uncertainty language for unfamiliar
      sources.
- ✅ Keep the skill project-agnostic and free of application-specific policy.

Completion evidence:

- 2026-08-23: Added `aix/skills/discover-skill/SKILL.md` with front matter for
  `discover-skill`, clarification rules, search order, candidate evidence,
  hard filters, ranking, candidate presentation, `install #` confirmation,
  `aix` command handoff, alias deferral, and no-results behavior.

Verification:

- Static review of the new `SKILL.md` front matter and instructions.
- Confirm the skill does not instruct agents to bypass `aix` safety checks.
- Confirm the skill can be followed without relying on repo-specific commands.

Verification evidence:

- 2026-08-23: Static review confirmed `SKILL.md` declares
  `name: discover-skill` and a description for natural-language skill
  discovery.
- 2026-08-23: Static review confirmed install instructions route through
  `aix skills add` and `aix skill activate` and explicitly forbid direct edits
  to `aix.json`, `aix.lock.json`, `.agents/`, `.agents/packages`, or
  `.agents/skills`.
- 2026-08-23: Ran `node -e` static validation for required front matter and
  sections, including clarification, search order, candidate evidence, ranking,
  candidate presentation, install handoff, and `aix` command routing.
- 2026-08-23: Ran `git diff --check`; no whitespace errors were reported.

### Phase 4: Default Install And Packaging Exposure (status: completed)

Goal: make the new skill part of the default `aix` skill installation without
tying it to workflow ownership.

Tasks:

- ✅ Ensure `aix init` installs and activates the new default bundled skill.
- ✅ Ensure the known-source index is packaged or otherwise available wherever
      the discovery helper expects to read it.
- ✅ Update bundled skill documentation so the new discovery helper appears
      with the other default bundled `aix` skills.
- ✅ Update packaging tests or fixtures that enumerate default bundled `aix`
      skills.
- ✅ Verify `aix init` exposes the new skill through the normal active skill
      path and that workflow uninstall does not remove it.

Verification:

- Targeted bundled-skill discovery or packaging tests.
- Targeted init tests for default bundled skill activation.
- Workflow uninstall test or fixture review confirming the helper is not
  workflow-owned.
- `npm run build`.

Completion evidence:

- 2026-08-23: Wired `aix init` to discover valid standalone bundled skills from
  the default `aix/skills` source and activate them through the existing skill
  activation path after workflow installation.
- 2026-08-23: Confirmed `discover-skill` is recorded as
  `aix:discover-skill` in `manifest.skills`, copied to
  `.agents/packages/skills/aix/discover-skill`, and exposed through
  `.agents/skills/discover-skill`.
- 2026-08-23: Confirmed `known-sources.json` is copied with the
  `discover-skill` package and is present in the npm package artifact.
- 2026-08-23: Updated bundled skill documentation in
  `_docs/design/bundled-skills.md` and `aix/skills/README.md`.

Verification evidence:

- 2026-08-23: Ran `npm run build`; TypeScript compilation passed.
- 2026-08-23: Ran
  `node --test tests/init.test.mjs tests/skills.test.mjs tests/package-smoke.test.mjs tests/skill-instructions.test.mjs`;
  16 tests passed.
- 2026-08-23: Ran `npm test`; 122 tests passed.
- 2026-08-23: Ran `git diff --check`; no whitespace errors were reported.

### Phase 5: Discovery Flow Validation (status: in progress)

Goal: validate the skill against realistic GitHub discovery scenarios without
turning it into an automated registry.

Tasks:

- ✅ Test the skill instructions with a request that requires clarification
      before discovery begins.
- ✅ Test the skill instructions with a request that matches a configured
      source skill.
- ✅ Test the skill instructions with a request that matches a known-source
      index entry.
- ✅ Test the skill instructions with a request that requires broader GitHub or
      internet search.
- ✅ Test the skill instructions with a request that matches a nested skill
      path.
- ⬜️ Test the skill instructions with weak search results where no installable
      skill should be recommended.
- ⬜️ Record examples of good candidate summaries, review links, `install #`,
      command preview, and quit behavior.

Verification:

- Manual transcript-style walkthroughs recorded in the plan or test fixtures.
- Confirm every install path still routes through `aix skills add` and
  `aix skill activate`.

Verification evidence:

- 2026-08-23: Clarification walkthrough prompt:
  `Use discover-skill. Find a skill for deployment. Do not install anything
  unless I explicitly reply with install #.` The skill asked one clarification
  question before searching because deployment is broad and may involve
  production systems, credentials, CI/CD, cloud infrastructure, or a specific
  platform.
- 2026-08-23: Configured-source walkthrough prompt:
  `Use discover-skill. Find a skill for TypeScript development. Do not install
  anything unless I explicitly reply with install #.` The skill checked
  configured/default sources first. Local `aix skills list` was blocked by
  stale cache entries, so the walkthrough inspected the configured
  `cursor-pstack` GitHub source and presented one credible candidate:
  `typescript-best-practices` at `cursor-pstack/typescript-best-practices`.
  The candidate included a review link to `SKILL.md`, relevance reason, unsafe
  flags, `q - Quit`, and the install command preview
  `aix skill activate cursor-pstack/typescript-best-practices`.
- 2026-08-23: Known-source-index walkthrough prompt:
  `Use discover-skill. Find a skill for accessibility-focused code reviews. Do
  not install anything unless I explicitly reply with install #.` The skill
  checked configured sources first, then used `known-sources.json` and found
  indexed candidates from `addyosmani/agent-skills`. It presented
  `frontend-ui-engineering` and `browser-testing-with-devtools` with source
  URLs, skill paths, review links to `SKILL.md`, relevance reasons, unsafe
  flags, `q - Quit`, explicit `install #` choices, and an install preview that
  first runs `aix skills add
  https://github.com/addyosmani/agent-skills/tree/main/skills`, then
  `aix skill activate agent-skills/<skill-path>`.
- 2026-08-23: Broader-search walkthrough prompt:
  `Use discover-skill. Find a general software-development skill for API
  design review. Do not install anything unless I explicitly reply with install
  #.` The skill searched configured/default sources, then the known-source
  index, then broader GitHub/internet results. It presented
  `api-and-interface-design` from `addyosmani/agent-skills` and `api-design`
  from `AbsolutelySkilled/AbsolutelySkilled`, including source URLs, skill
  paths, review links to `SKILL.md`, relevance reasons, unsafe flags,
  `q - Quit`, explicit `install #` choices, and install command previews using
  `aix skills add` followed by `aix skill activate`.
- 2026-08-23: Nested-path walkthrough prompt:
  `Use discover-skill. Find a skill for database or SQL development. Do not
  install anything unless I explicitly reply with install #.` The skill
  searched configured/default sources, the known-source index, and broader
  GitHub results. It presented `database-developer` from
  `mcroitor/agent-skills-library` with the nested skill path
  `development/database-developer`, plus `dbhub` from `bytebase/dbhub`. The
  output included source URLs, skill paths, review links to `SKILL.md`,
  relevance reasons, unsafe flags, `q - Quit`, explicit `install #` choices,
  and install previews using `aix skills add` followed by `aix skill activate`.
  The run raised a design concern: broader GitHub results are currently allowed
  after configured and known sources, but they are unreviewed and may need an
  explicit user confirmation step before being presented or installed.

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
