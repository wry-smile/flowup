# node-red-typescript-node-started

> A pnpm monorepo starter for building **Node-RED custom nodes and editor plugins** in TypeScript, with a single CLI that scaffolds, builds, and bundles.

## What's in here

```
.
├── cli/                     # @wry-smile/flowup — the build / scaffold / bundle CLI
├── packages/
│   ├── nodes/               # Node-RED node sub-packages
│   │   └── simple-node/
│   └── plugins/             # Node-RED editor plugin sub-packages
│       └── simple-plugin/
├── pnpm-workspace.yaml
└── package.json
```

## TL;DR

```bash
# 1. install deps (workspace)
pnpm install

# 2. scaffold a new node
pnpm gen:nodes
#  → flowup gen --outputDir ./packages/nodes --type node --locales en-US,zh-CN

# 3. scaffold a new editor plugin
pnpm gen:plugin

# 4. build everything in the monorepo, then assemble a meta package
cd packages/nodes/simple-node
flowup build
#  …or from the monorepo root:
flowup build --all --bundle
```

## Why this monorepo

`@wry-smile/flowup` is the dev-time CLI companion for shipping Node-RED customisations:

- **One CLI, three jobs** — `flowup build | gen | bundle`.
- **Vite-native** — runtime (CJS) + client (single-file inlined HTML) in two vite invocations.
- **Node-RED aware** — auto-copies `icons/`, `resources/`, `locales/`, `public/`, `README.md`, `LICENSE` into `dist/` on every build.
- **Monorepo-native** — `flowup build --all` walks `pnpm-workspace.yaml`; `flowup bundle` assembles every node into one meta package ready to drop into Node-RED.
- **CI-friendly** — `flowup gen --non-interactive` exits cleanly with no TTY, all flags required.

See **[`cli/README.md`](./cli/README.md)** for the full command reference and the `flowup.config.ts` schema.

## Node / plugin layout

Every package under `packages/nodes/<name>/` or `packages/plugins/<name>/` follows this shape:

```
my-node/
├── package.json                # { "node-red": { "scope", "nodes" | "plugins" } }
├── vite.config.ts              # exports defineConfig({ scope: 'my-node' })
├── runtime/index.ts            # NodeInitializer (server)
├── runtime/types.ts
├── client/index.ts             # EditorRED register (browser)
├── client/editor.html
├── client/help.html
├── client/types.ts
├── types/index.ts
├── locales/<lang>/             # i18n help (optional)
├── icons/                      # palette icons (optional)
└── resources/                  # static assets (optional)
```

The CLI copies `icons/`, `resources/`, `locales/`, `public/`, `README.md`, `LICENSE` into `dist/` automatically. Drop files in, run `flowup build`, done.

## Output: a meta package

`flowup bundle` produces:

```
dist/commonNodes/node-red-tp-built-in/
├── package.json                # { "node-red": { "nodes": {...}, "plugins": {...} } }
├── README.md
├── .gitignore
├── simple-node/
│   ├── simple-node.js
│   ├── simple-node.html
│   ├── package.json            # filtered (no devDependencies, scripts, etc.)
│   ├── locales/...
│   └── icons/...
└── simple-plugin/
    ├── simple-plugin.js
    ├── simple-plugin.html
    ├── package.json
    └── locales/...
```

`cd` into that directory and `npm publish` (or just point Node-RED at it locally) to install every node + plugin as a single package.

## Scripts

| Command | What it does |
|---|---|
| `pnpm build` | Build the CLI itself (tsdown → `cli/dist/`) |
| `pnpm gen:nodes` | Scaffold a new node (interactive) |
| `pnpm gen:plugin` | Scaffold a new plugin (interactive) |
| `flowup build` (in a sub-package) | Build that single sub-package |
| `flowup build --all` (in repo root) | Build every node-red sub-package |
| `flowup build --all --bundle` | Build every sub-package + assemble meta package |
| `flowup bundle` (in repo root) | Assemble meta package from existing `dist/` |

## License

MIT
