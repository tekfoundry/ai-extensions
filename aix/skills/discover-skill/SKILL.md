---
name: discover-skill
description: Find installable software-development agent skills from a natural-language request. Use when the user wants to discover, compare, or install a skill but does not already know the source URL and path.
---

# Discover Skill

Help the user find installable software-development agent skills without
turning discovery into automatic installation.

## Scope

Use this skill for requests such as:

- "Find a skill for accessibility-focused code reviews."
- "Add a skill for TDD."
- "I need help reviewing security issues."
- "Find a skill that helps write better React code."

Stay focused on software-development-relevant skills. Avoid candidates that
are primarily office productivity, personal automation, marketing,
therapy-adjacent, or focused on one vendor or technology unless the user's
clarified request asks for that technology.

## Clarify First

Ask one clarification question before searching when the request is too broad,
risky, or ambiguous to search usefully.

Clarify when:

- the domain is unclear, such as "deployment", "automation", or "review"
- the request may involve credentials, production systems, external services,
  destructive actions, or broad system access
- the user has not said whether they want a general workflow skill or a
  technology-specific one

If the request names a clear software-development capability, begin discovery
without extra questioning.

## Search Order

Search in this order:

1. Configured project skill sources, when available.
2. The companion `known-sources.json` source index.
3. Broader GitHub or internet results, only when configured and known sources
   do not produce enough credible candidates.

Treat every source as untrusted until inspected. A known-source entry is only a
discovery hint. It is not a trust guarantee, registry record, endorsement, or
permission to install.

## Candidate Evidence

Before presenting a candidate, collect:

- source URL
- normalized source path
- skill path within the source
- confirmation that `SKILL.md` is inspectable
- skill `name`
- skill `description`
- a short relevance reason tied to the clarified request
- a review link to the skill code or `SKILL.md`
- unsafe flags, if any

Do not present a candidate as install-ready unless the source root and skill
path can be determined.

## Hard Filters

Reject candidates that fail any of these checks:

- no inspectable skill instructions, preferably `SKILL.md`
- source root or skill path cannot be determined
- weak relation to the clarified request
- obvious unsafe instructions, such as asking for secrets, destructive actions,
  broad system access, credential handling, or unclear external actions without
  safeguards

Do not pad the list with weak matches. Fewer than five credible results is
better than a noisy list.

## Ranking

Rank candidates by:

1. direct purpose match against the clarified request
2. valid skill evidence from `name`, `description`, and instructions
3. installability through `aix skills add` and `aix skill activate`
4. source confidence, preferring configured sources, then known-source entries,
   then broader GitHub or internet results
5. instruction quality: specific, actionable, scoped, and clear
6. safety posture and absence of risky instructions
7. maintenance signals such as recent commits, clear ownership, stars, and
   activity as tie breakers only

Relevance is not trust. Say that plainly when a source is unfamiliar or a
candidate has meaningful unsafe flags.

## Present Candidates

Show up to five credible candidates as a numbered list. Include `q - Quit`
directly with the options.

Each candidate should include:

- skill name
- source name or repository
- short summary
- relevance reason
- review link
- unsafe flags, or `none observed`

Ask the user to inspect the review links and reply with `install #` to install
one candidate. A bare number is not enough.

## Install Handoff

Install only after the user replies with an explicit `install #` for a
candidate from the list you just showed.

Show each command before running it.

If the selected candidate's source is not configured, run:

```bash
aix skills add <source-url> [source-alias]
```

Then run:

```bash
aix skill activate <source>/<skill-path>
```

If the selected candidate's source is already configured, run only:

```bash
aix skill activate <source>/<skill-path>
```

Do not write `aix.json`, `aix.lock.json`, `.agents/`, `.agents/packages`, or
`.agents/skills` directly. Existing `aix` commands own source normalization,
lockfile writes, activation, collision handling, aliases, dependency
inference, and local drift protection.

## Aliases

Do not offer aliases in the first guided install flow. Keep the first version
simple and use the skill's natural name. If the user needs an alias, explain
that normal `aix skill activate <source>/<skill-path> <alias>` behavior can be
used later.

## No Results

If no credible installable skill is found, say so. Offer the user a choice to
broaden the search, change the requested capability, or create a project-local
skill later. Do not present uninspectable or weak results as install-ready.
