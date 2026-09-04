# Command reference

The command is `aix`. The npm package is `@tekfoundry/aix`.

Run `aix --help` for the top-level command list. Run a command with `--help`
for command-specific usage.

## Workspace

```bash
aix init
aix status
aix verify
aix update
```

`init` initializes package-management state and the default standalone skill.
`status` reports workspace state. `verify` checks managed content. `update`
updates the active workflow and locked standalone skills.

## Workflows

```bash
aix workflow install [git-or-github-tree-url] [alias]
aix workflow uninstall [--confirm-pm-data]
aix workflow update [--reconcile-protected]
aix workflow diff
```

Only one workflow can be active. Workflow-owned roles and skills follow the
workflow lifecycle.

See [workflow authoring](workflow-authoring.md) for the workflow manifest and
package structure.

## Skills

```bash
aix skills add <git-or-github-tree-url> [alias]
aix skills remove <source-name>
aix skills list <source> [--missing-only]
aix skills update [source/path]
aix skills diff [source/path]
aix skill activate <source/path> [alias]
aix skill deactivate <active-name>
```

The plural commands manage sources and groups of locked skills. The singular
commands activate or deactivate one skill.

## Roles

```bash
aix roles add <git-or-github-tree-url> [alias]
aix roles remove <source-name>
aix roles list <source> [--missing-only]
aix roles update [active-name|source/path] [--reconcile-protected]
aix roles diff [active-name|source/path]
aix role activate <source/path> [alias]
aix role deactivate <active-name>
aix role update <active-name|source/path> [--reconcile-protected]
aix role diff <active-name|source/path>
aix role guidance reset <active-name>
```

## Guidance and templates

```bash
aix guidance list
aix guidance publish
aix guidance diff [guidance-name]
aix guidance reset <guidance-name|--all>

aix templates list
aix templates publish
aix templates diff [template-name]
aix templates reset <template-name|--all>
```

Guidance and template publishing exposes the complete active workflow set for
project editing. Reset commands remove project overrides or restore active
role guidance according to the selected asset.

See [template authoring](template-authoring.md) for template structure and
placeholder rules, and [package management](package-management.md) for
ownership and drift behavior.

See [guidance authoring](guidance-authoring.md) for guidance origins, overrides,
metadata, and reset behavior.

## PM runtime

```bash
aix pm status [--verbose]
aix pm doctor [--verbose]
aix pm tidy [--archive|--apply|--purge] [--completed] [--older-than days]
```

`aix pm tidy` previews eligible records without changing files unless an
explicit mutation option is supplied.

See [PM runtime](pm-runtime.md) for scheduler state, host capabilities,
retention rules, and cleanup authorization.

## Interactive commands

Interactive selection is available when targets are omitted for workflow
installation, source listing or removal, skill activation or deactivation, and
role activation or deactivation.
