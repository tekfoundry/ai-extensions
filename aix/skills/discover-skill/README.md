# discover-skill

## Skill Summary

Finds installable software-development agent skills from a natural-language
request. It helps an agent search known skill sources, inspect candidate
`SKILL.md` files, summarize relevant matches, and install only after explicit
user selection.

Dependencies:

- `AGENTS.md`
- Project `aix` configuration, when present
- `known-sources.json`
- GitHub or internet search access when the user agrees to broaden search
- `aix skills add`
- `aix skill activate`

## How to use it

Here is a list of prompts that will invoke this skill:

- "Use discover-skill to find a skill for accessibility-focused code reviews."
- "Find an installable skill for TDD."
- "I need a skill that helps with secure code review."

`known-sources.json` is a simple list of GitHub tree URLs that point to
skill-source directories.

The entries are discovery hints. They are not a registry, lockfile, trust
guarantee, endorsement, or install record. Adding a URL here only gives the
`discover-skill` workflow another source to search. If no credible match is
found in configured or known sources, the skill asks before broadening to
unreviewed GitHub or web results.

Keep the file easy to edit:

```json
[
  "https://github.com/example/skills/tree/main/skills"
]
```

Before adding a source, review it as untrusted instructions:

- confirm it contains multiple software-development-relevant skills
- inspect representative `SKILL.md` files and any referenced scripts
- flag skills that ask for secrets, destructive actions, broad system access,
  credential handling, unclear external actions, or production changes
- add only URLs approved by a human reviewer

Do not add install metadata, scores, review notes, or trust labels to
`known-sources.json`. Keep those in plan history or review notes unless a later
feature designs a real metadata format.

## When it is used

Use this skill when the developer wants to discover, compare, or install a
software-development skill but does not already know the source URL and skill
path.

## What it does

The skill clarifies broad or risky requests, searches configured sources first,
then `known-sources.json`. It asks before broadening to unreviewed GitHub or
internet results. It inspects candidate `SKILL.md` files, filters weak or
unsafe matches, ranks up to five credible candidates, and asks the developer to
reply with `install #` to start install review. Before running commands, it
lists the files the developer should review, gives an initial assessment, shows
the exact commands, and waits for `confirm install #`. Installation stays
routed through `aix skills add` and `aix skill activate`.
