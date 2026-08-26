# Discover Skill Requirements

`discover-skill` is the standalone bundled skill that helps a developer find
installable software-development skills without turning discovery into
automatic installation.

## Actors

- Project developer: asks for a skill recommendation, reviews candidates, and
  explicitly approves any install.
- Agent runtime: follows the skill instructions and routes installation through
  normal AIX commands.
- Reviewer: inspects candidate skill files, trust status, unsafe flags, and
  proposed commands before installation.

## Installation Requirements

- `aix init` must activate `discover-skill` by default as a standalone bundled
  skill.
- Existing projects with the default AIX skill source available must be able to
  activate it with `aix skill activate aix/discover-skill`.
- The skill must use `known-sources.json` as a discovery hint file, not as a
  registry, trust guarantee, endorsement, score, or install record.

## User Stories

- As a project developer, I can ask for an installable software-development
  skill by natural-language capability so that I do not need to know the source
  URL or skill path first.
  Acceptance signals: clear software-development requests begin discovery;
  broad, risky, or ambiguous requests trigger one clarification question.

- As a project developer, I can see candidates from configured project skill
  sources before broader sources are considered.
  Acceptance signals: search order is configured sources first, then
  `known-sources.json`, then broader GitHub or internet results only after the
  user explicitly agrees.

- As a reviewer, I can inspect every candidate before installation is proposed.
  Acceptance signals: each candidate includes source URL, normalized source
  path, skill path, inspectable `SKILL.md` confirmation, skill name,
  description, relevance reason, review link, source trust status, and unsafe
  flags.

- As a reviewer, I can rely on hard filters to remove weak or risky results.
  Acceptance signals: candidates are rejected when instructions are not
  inspectable, source root or skill path cannot be determined, relevance is
  weak, or instructions obviously ask for secrets, destructive actions, broad
  system access, unclear external actions, credentials, or production changes
  without safeguards.

- As a project developer, I can choose a candidate with `install #` so that the
  agent prepares an install review packet before running commands.
  Acceptance signals: a bare number does not install; the packet lists files to
  review, purpose, instruction quality, install path, source trust status,
  unsafe flags, and exact commands.

- As a project developer, I can approve installation with `confirm install #`
  so that installation happens only after explicit confirmation for the same
  candidate.
  Acceptance signals: commands are shown before running; unconfigured sources
  use `aix skills add` then `aix skill activate`; configured sources use only
  `aix skill activate`.

## Safety Requirements

- The skill must stay focused on software-development-relevant skills unless
  the user explicitly asks for another domain.
- The skill must avoid office productivity, personal automation, marketing,
  therapy-adjacent, or single-vendor candidates unless the clarified request
  asks for that domain or technology.
- The skill must treat every source as untrusted until inspected.
- The skill must say that relevance is not trust when a source is unfamiliar or
  a candidate has meaningful unsafe flags.
- The skill must not write `aix.json`, `aix.lock.json`, `.agents/`,
  `.agents/packages/`, or `.agents/skills/` directly.
- The skill must not offer aliases in the first guided install flow.

## Candidate Ranking Requirements

- Rank by direct purpose match, valid skill evidence, installability through
  AIX commands, source confidence, instruction quality, safety posture, and
  maintenance signals.
- Present up to five credible candidates.
- Include `q - Quit` directly with the candidate list.
- Prefer fewer credible results over padded weak matches.

## Acceptance Criteria

- Candidate presentation includes enough evidence for human review.
- Install handoff cannot run without `confirm install #`.
- Installation is always delegated to `aix skills add` and
  `aix skill activate`.
- `known-sources.json` remains a simple list of GitHub tree URLs.
