---
name: flowup-consumer
description: Use this skill when the task is about consuming the published Flowup CLI to scaffold, build, or assemble Node-RED nodes and plugins. Focuses on command usage, flowup.config.ts configuration, generated package structure, and common consumer workflows rather than Flowup CLI source development.
metadata:
  short-description: Use the published Flowup CLI
---

# Flowup Consumer

Use this skill when the task is about using the published `@wry-smile/flowup` package rather than modifying Flowup internals.

## When To Use

- The user wants to scaffold a Node-RED node or plugin with `flowup gen`
- The user wants to build a generated package with `flowup build`
- The user wants to assemble multiple Flowup-built packages with `flowup assemble`
- The user needs help writing or adjusting `flowup.config.ts`
- The user needs help understanding the generated directory layout

## Core Commands

- `flowup gen`
  Generates a new node or plugin package scaffold
- `flowup build`
  Builds the current package in `runtime` and `editor` modes
- `flowup assemble`
  Scans Flowup-built packages and assembles their `dist/` outputs into one distributable package

## Recommended Workflow

### Generate a package

```bash
flowup gen --type node --name my-node --framework vue --tailwind
```

### Build a package

```bash
flowup build
```

### Assemble multiple packages

```bash
flowup assemble
```

## Configuration Entry

Use `flowup.config.ts` as the shared configuration entry for both package builds and assemble behavior.

Example:

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-node',
  type: 'nodes',
  assemble: {
    output: 'dist/node-red-assemble',
    name: 'node-red-my-assemble',
  },
})
```

## Generated Package Layout

Common generated folders:

- `runtime/`
- `client/`
- `types/`
- `constant/`
- `locales/`
- `icons/`
- `resources/`

## Framework Notes

- `vanilla`
  Best fit for native Node-RED editor patterns
- `vue`
  Best fit for custom-element driven editor panels
- `svelte`
  Best fit for lightweight reactive editor UIs
- `tailwind`
  Only applies to framework-based client templates, not vanilla templates

## Consumer Guidance

- Prefer `flowup.config.ts` over extra config entry files
- Treat `node-red.nodes` and `node-red.plugins` package.json fields as output file mappings, not source imports
- If the task is about Flowup CLI internals, templates, or source refactors, use a dedicated development-oriented Flowup skill instead of this one
