# Flowup CLI

Flowup is a CLI for scaffolding, building, and assembling Node-RED nodes and plugins with a Vite-based workflow.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

## Commands

### `flowup gen`

Generate a new Node-RED node or plugin template in the current directory.

```bash
flowup gen --type node --name my-special-node
```

Options:

- `--type <node|plugin>`
- `--name <kebab-case>`
- `--locales <csv>`
- `--framework <vanilla|svelte|vue>`
- `--vue [bool]`
  Compatibility option. Prefer `--framework`.
- `--tailwind [bool]`
- `--non-interactive`

If required options are missing, Flowup switches to interactive prompts.

### `flowup build`

Build the current Node-RED package from `flowup.config.ts` or `vite.config.ts`.

```bash
flowup build
```

Equivalent to running:

```bash
vite build --mode runtime
vite build --mode editor
```

Options:

- `--cwd <path>`
- `--config <path>`
- `--mode <all|runtime|editor>`

### `flowup assemble`

Assemble all Flowup-built Node-RED nodes and plugins into one distributable package.

- In a monorepo, Flowup scans from the workspace root.
- Outside a monorepo, Flowup scans from the current working directory.

```bash
flowup assemble
```

Flowup loads assemble configuration from `flowup.config.ts` by default.

Recommended configuration:

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  assemble: {
    output: 'dist/node-red-assemble',
    name: 'node-red-my-assemble',
    version: '1.0.0',
    packages: ['packages/nodes/foo', 'packages/plugins/bar'],
    skipBuild: false,
  },
})
```

Options:

- `--cwd <path>`
- `--config <path>`
- `--output <path>`
- `--name <name>`
- `--version <version>`
- `--description <text>`
- `--author <author>`
- `--license <license>`
- `--packages <csv>`
- `--no-clean`
- `--skip-build`

## Configuration

`flowup.config.ts` is the shared entry for build-time and assemble-time behavior.

Typical package config:

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-node',
  type: 'nodes',
})
```

Typical plugin config:

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-plugin',
  type: 'plugins',
})
```

## Notes

- Generated templates keep the same Node-RED-oriented directory layout.
- `build` uses Vite multi-mode builds for `runtime` and `editor`.
- `assemble` merges package outputs from `dist/` and generates a top-level `package.json`.
- `.ts` config loading reuses the Vite runner, so no extra `tsx` execution chain is required.

## Client SDK

`@wry-smile/flowup/client` exposes reusable helpers for Node-RED editor UIs:

- `createHydrateStore(...)`
- `createVueHydrateStore(...)`
- `createTailwindcssBridge(...)`

Framework templates generate the matching glue files automatically, such as `client/hydrate.ts` and `client/useTailwind.ts`.
