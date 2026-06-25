# Flowup CLI

## Overview

`flowup` is a command-line interface (CLI) for building, scaffolding, and bundling **Node-RED custom nodes and editor plugins** in a pnpm monorepo.

It ships:

- A Vite-based build pipeline that compiles `runtime/` (server-side CJS) and `client/` (browser single-file HTML) for each node, plus copies Node-RED resource conventions (`icons/`, `resources/`, `locales/`, `public/`, `README.md`, `LICENSE`) into `dist/`.
- A `@clack/prompts`-powered generator that scaffolds a fresh node or plugin in seconds — fully non-interactive when all flags are provided.
- A monorepo bundler that scans `pnpm-workspace.yaml`, builds every node-red package, and assembles a single meta package under `dist/commonNodes/node-red-tp-built-in/` ready to drop into Node-RED.

## Quickstart

In a pnpm workspace with a `flowup.config.ts` (optional) and a node package with this structure:

```
my-node/
├── package.json          # { "node-red": { "scope": "my-node", "nodes": {...} } }
├── vite.config.ts        # exports defineConfig({ scope: 'my-node' })
├── runtime/index.ts      # NodeInitializer (server)
├── client/index.ts       # EditorRED register (browser)
├── client/editor.html    # template script
├── locales/<lang>/       # i18n help files (optional)
├── icons/                # palette icons (optional)
└── resources/            # static assets (optional)
```

Build a single node:

```bash
flowup build
```

Scaffold a new node:

```bash
cd packages/nodes
flowup gen --name my-special-node --type node
```

Build every node-red package in the workspace:

```bash
flowup build --all
```

Build and immediately bundle into a meta package:

```bash
flowup build --all --bundle
```

Bundle only (skip the per-package build step):

```bash
flowup bundle --skip-build
```

## Commands

### `flowup build`

Build one or many node-red packages.

| Flag                     | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `--cwd <path>`           | Working directory (default: `process.cwd()`)                          |
| `--config <path>`        | Explicit path to `vite.config.ts` (overrides findup)                  |
| `--all`                  | Build every node-red package in the pnpm workspace                    |
| `--pkg <name...>`        | Restrict `--all` to packages whose `name` matches (repeatable)        |
| `--watch`                | Vite watch mode for a single-package dev loop                         |
| `--bundle`               | After building, also assemble a meta package                          |
| `--bundle-output <path>` | Bundle output path (default: `dist/commonNodes/node-red-tp-built-in`) |
| `--bundle-name <name>`   | Bundle meta package name (default: `flowup-bundle`)                   |
| `--bundle-install`       | Run `pnpm install` in the bundle output after bundling                |

`flowup build` automatically findups the nearest `vite.config.ts` from the cwd, so it works in monorepo sub-packages without `cd`.

### `flowup gen`

Scaffold a new Node-RED node or editor plugin in the **current directory** — `cd` into the target dir first, just like `npm create vite` and `nest g`.

| Flag                    | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `--name <kebab-case>`   | Required (or via interactive prompt).                          |
| `--type <node\|plugin>` | Required (or via prompt).                                      |
| `--locales <csv>`       | Comma-separated locales, e.g. `en-US,zh-CN`.                   |
| `--non-interactive`     | Throw if any required option is missing, instead of prompting. |

For monorepos, put a script in the root `package.json` to wrap the `cd`:

```json
{
  "scripts": {
    "gen:node": "cd packages/nodes && flowup gen --type node",
    "gen:plugin": "cd packages/plugins && flowup gen --type plugin"
  }
}
```

When **all** required options are provided, `flowup gen` writes the scaffold directly with no prompts — safe for CI.

Interactive mode uses `@clack/prompts`.

### `flowup bundle`

Scan the workspace, build every node-red package, and assemble a meta package.

| Flag                  | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `--cwd <path>`        | Working directory (default: `process.cwd()`)                     |
| `--output <path>`     | Bundle output (default: `dist/commonNodes/node-red-tp-built-in`) |
| `--name <name>`       | Meta package name (default: `flowup-bundle`)                     |
| `--version <version>` | Meta package version (default: `1.0.0`)                          |
| `--no-clean`          | Do not clear the output directory before bundling                |
| `--install`           | Run `pnpm install` in the bundle output after bundling           |
| `--skip-build`        | Use existing `dist/` (don't rebuild)                             |

Output structure:

```
dist/commonNodes/node-red-tp-built-in/
├── package.json                          # { "node-red": { "nodes": ..., "plugins": ... } }
├── README.md
├── .gitignore
├── simple-node/
│   ├── simple-node.js
│   ├── simple-node.html
│   ├── package.json                      # filtered
│   ├── locales/...
│   └── icons/...
└── simple-plugin/
    ├── simple-plugin.js
    ├── simple-plugin.html
    ├── package.json
    └── locales/...
```

## `flowup.config.ts`

Optional. Drop a `flowup.config.ts` (or `.js` / `.mjs` / `.cjs`) anywhere up the directory tree from where you run `flowup`. The CLI auto-discovers it via findup.

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  // Monorepo root (default: the dir containing flowup.config.ts)
  root: '.',

  // Per-package package.json filtering
  packageJson: {
    include: ['name', 'version', 'type', 'node-red', 'description'],
    omit: ['scripts', 'devDependencies', 'dependencies'],
  },

  // Disable specific Node-RED resource conventions globally
  // (you can override per-package in that package's vite.config.ts)
  resources: {
    icons: true,
    resources: true,
    locales: true,
    public: true,
    readme: true,
    license: true,
  },

  bundle: {
    output: 'dist/commonNodes/node-red-tp-built-in',
    name: 'my-org-nodes',
    version: '1.0.0',
    description: 'My organization\'s Node-RED nodes',
    author: 'Acme',
    license: 'MIT',
    install: false,
  },
})
```

## Resource conventions

For every node-red package, `flowup build` automatically copies these into `dist/`:

| Source                    | Destination         | Toggle                       |
| ------------------------- | ------------------- | ---------------------------- |
| `package.json` (filtered) | `dist/package.json` | always                       |
| `icons/`                  | `dist/icons/`       | `resources.icons: false`     |
| `resources/`              | `dist/resources/`   | `resources.resources: false` |
| `locales/`                | `dist/locales/`     | `resources.locales: false`   |
| `public/`                 | `dist/public/`      | `resources.public: false`    |
| `README.md`               | `dist/README.md`    | `resources.readme: false`    |
| `LICENSE`, `LICENSE.md`   | `dist/LICENSE`      | `resources.license: false`   |

You can also pass `copyTask: [{ from, to }]` in `defineConfig()` to add custom copies (e.g. `node-red.png` for the catalog icon).

## Package.json filtering

`flowup build` writes a **filtered** `dist/package.json`. Default include set:

```
name, version, type, node-red, description, author, license, keywords,
engines, main, files
```

Default omit set (always removed):

```
scripts, devDependencies, dependencies, peerDependencies, peerDependenciesMeta, optionalDependencies
```

Override in `flowup.config.ts`:

```ts
defineConfig({
  packageJson: {
    include: ['name', 'version', 'node-red', 'dependencies'], // keep dependencies
  },
})
```

## SDK usage

`@wry-smile/flowup` can be used as a TypeScript SDK too:

```ts
import { buildEntry, bundleMonorepo, defineConfig, runGenerator } from '@wry-smile/flowup'

await buildEntry({ cwd: '/path/to/my-node' })
```

## License

MIT
