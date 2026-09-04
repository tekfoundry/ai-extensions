# Getting started

## Install AIX

Install the scoped npm package:

```bash
npm install -g @tekfoundry/aix
```

Check the installation:

```bash
aix --help
```

## Initialize a project

From the root of the project you want to manage:

```bash
aix init
```

Initialization creates or updates `aix.json`, creates `aix.lock.json` when it
does not exist, configures the default skill sources, and activates the
standalone `discover-skill` helper when it is available from the bundled
source.

Install the default workflow separately:

```bash
aix workflow install
```

The workflow install adds the managed workflow instructions, workflow-owned
roles and skills, guidance, templates, and project documentation scaffolding.

The two initialization commands have different jobs:

| Command | What it adds |
| --- | --- |
| `aix init` | `aix.json`, `aix.lock.json`, default source definitions, and standalone bundled skills such as `discover-skill`. |
| `aix workflow install` | The active workflow, PM role, registered team, workflow-owned roles and skills, guidance, templates, managed `AGENTS.md` instructions, and workflow docs. |

## Check the workspace

```bash
aix status
aix verify
```

`status` summarizes the configured and active state. `verify` checks the
manifest, lockfile, package files, active files, workflow integration, and
other managed content for drift or missing files.

## Add a skill

Add a Git-backed source, inspect its contents, then activate one skill:

```bash
aix skills add https://github.com/example/skills/tree/main/skills team-skills
aix skills list team-skills
aix skill activate team-skills/review
```

Review changes before accepting an update:

```bash
aix skills diff
aix skills update
```

### Find a skill with `discover-skill`

The bundled `discover-skill` helper can search configured sources before you
activate anything. Ask it for a capability in plain language:

```text
Use discover-skill. Find a skill for accessibility-focused code reviews.
Do not install anything unless I explicitly reply with install #.
```

The helper presents the available options and a review link. If you reply with
`install 1`, it shows the files, its initial assessment, and the exact AIX
commands it would run. It waits for `confirm install 1` before changing the
project.

## Use a role

Roles provide a focused responsibility or point of view. Add a source and
activate a role with:

```bash
aix roles add https://github.com/example/roles/tree/main/roles team-roles
aix roles list team-roles
aix role activate team-roles/quality-engineer
```

## Work with the bundled workflow

After installing `design-plan-execute`, use the workflow's project-manager and
registered team to route project work. In direct conversation, the PM treats
the human decision principal as Boss and delegates bounded responsibilities to
sub-agents.

Inspect workflow and PM state with:

```bash
aix workflow diff
aix pm status
aix pm doctor
```

See [workflow orchestration](workflow-orchestration.md) for the PM model and
the bundled workflows. See [Work with the AIX PM](pm-quickstart.md) for
conversation examples and [PM runtime](pm-runtime.md) for technical details.

## From this repository

For local development of AIX itself:

```bash
npm install
npm run build
node bin/aix.js --help
```
