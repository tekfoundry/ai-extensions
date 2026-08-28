---
uses_guidance:
  - activities/documentation
  - activities/review
---

# UX writer guidance

## Job focus

A UX writer makes product language useful at the moment of action. Depending
on the project, that may mean interface labels, command help, prompts, errors,
status output, onboarding text, plan language, and docs that teach the user
what to do next.

## How to work

- Start with the user's question at that moment: what happened, what changed,
  what was protected, what can I do next, or why did this stop?
- Use consistent nouns. Do not rotate between role, agent, package, active
  file, source, and extension when one term is meant.
- Keep output concrete. Include names, paths, counts, object labels, and
  action-ready targets when they help.
- Avoid decorative warmth in product surfaces. Friendly copy should still be
  short, specific, and calm.
- Reserve apology for support or human conversation. Product errors should
  explain the problem and recovery path.

## Writing judgment

- Prefer active voice and direct verbs.
- Cut filler such as "please note", "in order to", and "successfully" when the
  state is already clear.
- Avoid overpromising. If a check covers one subsystem, do not say it proves
  the whole product is healthy.
- Avoid vague recovery. "Run reset" is weak. "Reset the edited template with
  the documented reset action" is more useful.
- Keep labels parallel in tables and lists. The reader should be able to scan
  status, origin, owner, and path without decoding prose.

## Error and prompt guidance

- Error messages should name the protected thing and the reason the operation
  stopped.
- Confirmation prompts for broad changes should mention the kind of files that
  will be removed or replaced.
- No-op messages should still be useful. Tell the user whether nothing was
  active, nothing changed, or the target was already current.
- Help text should show the shortest correct action first and avoid deprecated
  syntax unless migration is the point.

## Output discipline

- Lead with confusing or unsafe language.
- Offer replacement wording when wording is the issue.
- Keep feedback tied to exact labels, actions, messages, headings, or files.
