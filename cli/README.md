# Flowup CLI

Flowup is a CLI for scaffolding, building, and assembling Node-RED nodes and plugins with a Vite-based workflow.
It requires Node.js `^20.19.0 || >=22.12.0`.

## Commands

### `flowup gen`

Run `flowup gen` to choose a single-entry or multi-entry package interactively. The multi-entry wizard can add several child entries immediately. In an existing multi-entry package, `flowup gen` opens the add-entry wizard.

```bash
flowup gen --type node --name my-special-node
```

Options:

- `--type <node|plugin>`
- `--name <kebab-case>`
- `--locales <csv>`
- `--framework <vanilla|vue|svelte|preact|solid>`
- `--unocss [bool]` for scoped UnoCSS in framework templates
- `--non-interactive`

If required options are missing, Flowup switches to interactive prompts.

For a Vue node with scoped atomic CSS:

```bash
flowup gen --type node --name my-node --framework vue --unocss --non-interactive
```

The same options work for a plugin or with `--framework svelte`, `preact`, or `solid`. The generated
framework clients mount inside a `data-flowup-scope` container. `--unocss` sets
`UnoCSS({ presets: [presetFlowupWind4({ scope })] })` in `client.plugins`. The generated package owns the `unocss` dependency, so you can choose a compatible version.
The preset needs `scope` explicitly because UnoCSS creates presets before Flowup resolves `defineConfig`.

To generate several nodes or plugins in one package:

```bash
flowup gen package my-package
cd my-package
flowup gen add node sensor --framework vue --unocss
flowup gen add plugin dashboard
pnpm install && pnpm build
```

Each group shares one runtime entry and editor HTML. See [Multi-entry packages](#multi-entry-packages).

`flowup gen package` prompts for a package name and offers to add child entries. `flowup gen add` prompts for entry type, name, framework, UnoCSS, and locales. Fully specified commands above remain non-interactive.

### Multi-entry packages

Flowup discovers `nodes/*/` and `plugins/*/` automatically. No entries manifest or explicit `entries` list is needed. Child entries use the same `runtime/`, `client/`, `constant/`, `types/`, `icons/`, `resources/`, and `locales/` directories as single-entry packages. Both node and plugin entries include `client/editor.html`; each group's templates are combined into its generated HTML alongside the bundled client script. Node-RED loads that HTML next to the same-named runtime JS file.

Flowup reports a missing `client/editor.html` during the editor build.

`gen add` updates Node-RED mappings, framework dependencies, and the generated `flowup.config.ts` after each entry. If you customized the config, Flowup preserves it and prints a suggested configuration. Run `pnpm install` after adding an entry. The generated config uses entry directory lists for Preact and Solid and sets aliases for `@` (package root), `@shared`, `@client-shared`, and `@runtime-shared`; the root `tsconfig.json` uses matching paths. Same-group framework code and UnoCSS output share one editor build, so identical modules and utility rules are deduplicated within that group. Nodes and plugins are separate builds, so code and utility rules used by both groups can appear in both outputs. Node types and plugin IDs use `<scope>-<entry-name>`, so entry names must be distinct across `nodes/` and `plugins/`. TSX entries use `client/index.tsx` and a child `tsconfig.json` with their `jsxImportSource`. Preact TSX uses an explicit `preact({ include: [...] })` plugin. The generated package declares `@preact/preset-vite`; the package manager resolves its Babel peer dependency.

See [framework-gallery](../examples/framework-gallery/README.md) for a generated package with all five node frameworks, a Preact plugin, shared code, i18n, icons, resources, and scoped UnoCSS.

Framework templates include `client/i18n.ts`, which uses `createEditorI18n(RED, '<package>/<node-red-entry>', NODE_NAME)` (or `PLUGIN_NAME`) to translate keys such as `t('label.name')` inside Vue, Svelte, Preact, and Solid components. Define those keys in each entry's `locales/<locale>/<entry>.json`; grouped builds merge the child catalogs into the group catalog Node-RED reads. Update the package and entry namespace if you rename either field in `package.json`.

Child icon files are emitted flat under `dist/icons/` with the entry name prepended. For example, `nodes/sensor/icons/status.svg` becomes `dist/icons/sensor-status.svg`; set the Node-RED `icon` field to `sensor-status.svg`. Child resources remain under `dist/resources/<entry-name>/`. Child locale catalogs and help files are combined into `dist/locales/<locale>/<scope>-nodes.{json,html}` or `<scope>-plugins.{json,html}` for Node-RED's grouped entries. Root asset directories are supported too.

Set `entries` in `flowup.config.ts` only to override paths or attach entry-specific Vite plugins. An explicit `entries` object replaces directory discovery. Package-level `client.plugins` and `runtime.config.plugins` apply to their respective builds; `clientPlugins` and `runtimePlugins` apply to the whole entry group, so filter files inside the plugin when needed.

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-package',
  entries: {
    nodes: {
      sensor: {
        runtime: 'nodes/sensor/runtime/main.ts',
        clientPlugins: [sensorTransformPlugin()],
      },
    },
  },
})
```

### `flowup build`

Build the current Node-RED package from `flowup.config.ts` or `vite.config.ts`.

```bash
flowup build
```

The default `all` mode runs the runtime and editor builds as one transaction.
It writes to a temporary sibling directory and replaces `dist/` only after the
runtime, editor, package metadata, and artifact manifest have all been
validated.

Runtime dependencies imported by the node code are bundled into the runtime. Generated configs set `runtime.config.ssr.noExternal: true`; Flowup also applies this default when loading existing Flowup configs.

```bash
flowup build --mode all
```

The generated `dist/flowup.manifest.json` is consumed by `flowup assemble` as
the artifact contract. Development-only `runtime` and `editor` modes write to
`.flowup/runtime/` and `.flowup/editor/`; they never modify the publishable
`dist/` directory.

Options:

- `--cwd <path>`
- `--config <path>`
- `--mode <all|runtime|editor>`

### `flowup dev`

Build the current package, then start a Node-RED editor with `nodesDir` set to
the completed `dist/` output. Flowup then watches the package for changes,
rebuilds it, and restarts Node-RED after a successful build. The preview runs
until you stop the command.
Generated node and plugin packages include a `dev` script and a Node-RED
development dependency.

```bash
pnpm dev
# or: flowup dev --cwd examples/my-node
```

Configure the preview in `flowup.config.ts`:

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-node',
  nodeRed: {
    port: 1880,
    host: '127.0.0.1',
    userDir: '.flowup/node-red',
    // settingsFile: 'node-red/settings.cjs',
    // flowsFile: 'flows.json',
    // safe: true,
  },
})
```

`userDir` defaults to `.flowup/node-red` under the package root, keeping
preview flows separate from your normal Node-RED data. `settingsFile` resolves
relative to the config file; `userDir` resolves relative to the package root.
Flowup gives the preview `userDir` a CommonJS `package.json` when it has none,
so Node-RED's generated `settings.js` also works inside a package with
`"type": "module"`. An existing `userDir/package.json` is preserved; its
`type` must not be `module`.
When a custom settings file is inside an ESM package, use a `.cjs` extension.
The built `dist/` always takes precedence over `nodesDir` in a custom settings
file. The preview loads only Node-RED's built-in nodes and the current `dist/`
package, excluding cached nodes under `node_modules`. Install `node-red` in the package's development dependencies if it is not
already available. `--cwd` and `--config` use the same path rules as `build`.
Node-RED's process working directory is the package root. Flowup excludes
`dist/`, the configured `userDir`, `.flowup/`, `node_modules/`, and test directories from watching, using 500 ms polling.
Changes within 250 ms are combined; builds run serially, and Node-RED restarts
once after the final successful build. On a build failure, the current preview
continues running. Changing the configured package root requires restarting
`flowup dev`.

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
    packages: ['examples/foo', 'examples/bar'],
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

### Scoped UnoCSS

Each generated framework editor imports `virtual:uno.css` when UnoCSS is selected. Flowup deduplicates these imports in a multi-entry build. Framework apps mount under
`data-flowup-scope="my-node"`. The Flowup Wind4 preset prefixes generated
utility selectors with that scope, limits its reset and theme variables to the
container, and gives generated `@property` registrations and animation
keyframes package-specific names. It does not require a separate PostCSS setup.

If a framework component teleports an overlay outside the editor container,
put the same attribute on the overlay root:

```html
<div data-flowup-scope="my-node">...</div>
```

Keep utility names statically discoverable in source, or add dynamic names to
the UnoCSS safelist. The preset covers its generated CSS; package-authored
global CSS, including `@font-face`, needs its own isolation strategy.
For focused setup guidance, see the packaged
[Flowup UnoCSS skill](./skills/flowup-unocss/SKILL.md).

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

## Troubleshooting

- If `assemble --skip-build` reports a missing or unsupported manifest, rebuild every component with the current CLI.
- If `/resources/<package>/...` returns 404 after installation, ensure the package `files` list includes both `dist` and the root `resources` directory.
- If a workspace works but its tarball does not install, test the actual `.tgz` and check that it contains no `workspace:` or `catalog:` dependency ranges.
- If an installed combined package cannot find a node or plugin, do not rearrange its component directories; rerun `assemble` and pack that output directly.

## Client SDK

`@wry-smile/flowup/client` exposes reusable helpers for Node-RED editor UIs:

- `createHydrateStore(...)`
- `createClientI18n(...)`

Framework-specific hydrate adapters are exported from isolated entry points:

- `@wry-smile/flowup/client/preact` (optional peer: `@preact/signals`)
- `@wry-smile/flowup/client/solid` (optional peer: `solid-js`)
- `@wry-smile/flowup/client/svelte` (optional peer: `svelte`)
- `@wry-smile/flowup/client/vue` (optional peer: `vue`)

Framework templates configure `unocss/vite` with `presetFlowupWind4({ scope })` and mount inside a
`data-flowup-scope` container. Flowup scopes the CSS using the package scope;
custom global CSS remains the package author's responsibility.
