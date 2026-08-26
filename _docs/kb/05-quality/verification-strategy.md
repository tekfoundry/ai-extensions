# Verification Strategy

## Verification Layers

- Unit and domain tests for parsing, source handling, lockfile behavior,
  activation, roles, workflows, templates, status, and verification.
- CLI-path tests that run compiled `dist` entrypoints for user-facing command
  behavior.
- Package smoke tests that validate the npm package artifact contains a
  working `aix` binary.
- Drift and no-overwrite tests for safety-sensitive local file operations.
- Markdown/template tests for workflow-owned skill, role, and plan template
  contracts.

## Common Commands

```bash
npm run build
node --test tests/templates.test.mjs
node --test tests/init.test.mjs tests/package-smoke.test.mjs
node --test tests/roles.test.mjs
node --test tests/skill-instructions.test.mjs
npm test
node dist/cli.js verify
git diff --check
```

Use targeted tests first for the changed subsystem. Run broader checks when a
change touches shared contracts, package-managed assets, CLI behavior,
lockfile shape, workflow install/update behavior, or release packaging.

## Regression Matrix

| Area | Evidence |
| --- | --- |
| Manifest and lockfile | Parser tests, init tests, verify/status tests |
| Source resolution | Source management/listing tests and activation tests |
| Skill lifecycle | Activation, update, diff, deactivate, dependency tests |
| Role lifecycle | Role activation, delegation, collision, update, verify tests |
| Workflow lifecycle | Init, workflow install/update/diff/uninstall, verify tests |
| Templates | Template discovery, publish, diff, reset, render fixture tests |
| Package artifact | `npm pack` smoke test |
| Docs workflow | Skill-instruction tests, plan template fixture tests, docs scans |

## Known Validation Gaps

- Host-native agent integrations are intentionally deferred and are not covered
  beyond the `.agents/roles` and `.agents/skills` canonical storage model.
- Real remote Git network behavior is usually represented by temporary local
  Git repositories in tests.
- Manual review remains required for final release readiness, workflow wording,
  and documentation depth.
