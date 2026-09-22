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

A full build is written through a temporary staging directory and replaces
`dist/` only after the runtime, editor, package metadata, and artifact manifest
have all been validated. The generated `dist/flowup.manifest.json` is consumed
by `flowup assemble` as the artifact contract.

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

The default output is `dist/flowup-assemble` at a workspace root. If the scan
root is itself a source package, Flowup uses a sibling directory instead so the
assemble output cannot overlap source files or the component `dist/`.

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
- `assemble` builds and validates every component before atomically replacing its output.
- `.ts` config loading reuses the Vite runner, so no extra `tsx` execution chain is required.

## Packaging

Generated projects are packaged from the project root. Their source
`package.json` points Node-RED to `dist/<name>.js`, while the nested
`dist/package.json` uses paths relative to `dist/` for assemble compatibility.
The package publishes both `dist/` and the root `resources/` directory:
Node-RED loads runtime/editor/locales/icons relative to the `dist/` entry, but
serves module resources from the package root.

```bash
pnpm build
npm pack --dry-run
```

Do not publish an incomplete `runtime`-only or `editor`-only build.

For a release-level verification, pack and install the actual tarball rather
than relying on a workspace link:

```bash
npm pack
npm install ./flowup-my-node-1.0.0.tgz
```

Generated packages include a README, MIT LICENSE, non-empty description,
Node-RED keywords, and the complete publish file list. Customize author and
repository metadata before publishing your own package.

## Compatibility and release checks

Flowup requires Node.js `^20.19.0 || >=22.12.0` to run the CLI. Generated
runtime packages are verified against Node-RED 4 and Node-RED 5 in CI.

Repository release gates:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm check:examples
pnpm test:e2e
pnpm check
```

`pnpm test:e2e` packs and installs the real CLI tarball, generates a node and
plugin in an empty directory, builds and assembles them, packs the component
and assembled packages, installs those tarballs into isolated Node-RED user
directories, and verifies runtime and HTTP resources.

## Migrating earlier 2.x artifacts

After upgrading the CLI, remove old `dist/` directories and run a complete
`flowup build`; do not reuse an earlier runtime-only or editor-only artifact.
Run `npm pack` from each component root, or directly from the `assemble` output
directory for a combined package. Do not rename or move component directories
inside an assembled output because their names are part of the Node-RED entry
paths.

## Troubleshooting

- If `assemble --skip-build` reports a missing or unsupported manifest, rebuild every component with the current CLI.
- If `/resources/<package>/...` returns 404 after installation, ensure the package `files` list includes both `dist` and the root `resources` directory.
- If a workspace works but its tarball does not install, test the actual `.tgz` and check that it contains no `workspace:` or `catalog:` dependency ranges.
- If an installed combined package cannot find a node or plugin, do not rearrange its component directories; rerun `assemble` and pack that output directly.

## Client SDK

`@wry-smile/flowup/client` exposes reusable helpers for Node-RED editor UIs:

- `createHydrateStore(...)`
- `createVueHydrateStore(...)`
- `createTailwindcssBridge(...)`

Framework templates generate the matching glue files automatically, such as `client/hydrate.ts` and `client/useTailwind.ts`.
