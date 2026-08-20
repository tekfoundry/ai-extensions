# AI Extensions Design Index

This directory contains stable design intent for AI Extensions.

Start here, then follow the topic documents for the level of detail needed.

## Documents

- [Overview](overview.md): product goal, ownership model, and implementation direction.
- [CLI](cli.md): command name, npm distribution, and command surface.
- [Package Management](package-management.md): manifest, lockfile, install flow, drift protection, and skill naming.
- [Bundled Skills](bundled-skills.md): default workflow skills included with AI Extensions.

## Current MVP Shape

AI Extensions is a small package-manager-style CLI for managing AI-agent
extensions inside software projects. The MVP starts with agent skills.

The MVP focuses on Git-based skill sources, project-local installs into
`.agents/skills`, lockfile integrity, collision detection, local drift
protection, and a short `aix` command surface.
