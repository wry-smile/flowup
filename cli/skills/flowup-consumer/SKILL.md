---
name: flowup-consumer
description: Use the published Flowup CLI to scaffold, configure, build, assemble, pack, or troubleshoot Node-RED nodes and plugins. Covers flowup.config.ts, publishable versus partial outputs, artifact validation, package-root publishing, and safe consumer workflows. Do not use for Flowup CLI source development.
metadata:
  short-description: Build Node-RED packages with Flowup
---

# Flowup Consumer

Guide users through the existing `@wry-smile/flowup` workflow. Prefer the smallest command sequence that achieves the task, and do not invent unsupported CLI flags or config fields.

## Choose The Workflow

- Scaffold a package: `flowup gen`
- Create a publishable component artifact: `flowup build`
- Build and preview a single package in Node-RED: `flowup dev`
- Diagnose only one build half: `flowup build --mode runtime` or `flowup build --mode editor`
- Combine several built components: `flowup assemble`
- Reuse existing complete artifacts: `flowup assemble --skip-build`

## Scaffold

Run the generator from the directory that should contain the new package:

```bash
flowup gen \
  --type node \
  --name my-node \
  --framework vue \
  --unocss \
  --non-interactive
```

Use a kebab-case name beginning with a letter. Valid examples include `my-node` and `sensor2`; path separators, `..`, uppercase letters, and an existing target directory are rejected.

Supported package types are `node` and `plugin`. Supported client frameworks are `vanilla`, `vue`, `svelte`, `preact`, and `solid`; scoped UnoCSS applies to every non-vanilla framework template.

For multiple nodes or plugins in one package, run `flowup gen` and select the multi-entry wizard, or run `flowup gen package my-package`, enter that directory, then run `flowup gen add node sensor --framework vue --unocss` or `flowup gen add plugin dashboard`. Running `flowup gen` inside a generated multi-entry package opens the add-entry wizard. Flowup discovers `nodes/*/` and `plugins/*/` automatically; no entries manifest or config list is needed. Each child follows the single-entry layout with `runtime/index.ts`, `client/index.ts` (or `index.tsx` for Preact and Solid), `client/editor.html`, `constant/`, `types/`, `icons/`, `resources/`, and `locales/`. Entries in the same group share one runtime bundle and one generated editor HTML. `gen add` updates the generated `flowup.config.ts` and dependencies; if the config was customized, it prints a suggested config and preserves your edits. The root `@` alias resolves to the package directory, with dedicated `@shared`, `@client-shared`, and `@runtime-shared` aliases. Child icons are flattened into `dist/icons/<entry>-<filename>`; use only that filename in Node-RED's `icon` field. Framework dependencies and declarations are added only when a matching entry is generated; see the packaged `README.md`.

## Scoped Framework Styles

Vue, Svelte, Preact, and Solid templates mount as ordinary framework apps. `--unocss` adds `unocss/vite` with the exported `presetFlowupWind4({ scope })` to `client.plugins`; the generated package declares its own UnoCSS dependency. In generated multi-entry packages, `gen add` updates `flowup.config.ts` after every entry unless you have customized it. It also updates dependencies and prints `pnpm install`. Each UnoCSS client visibly imports `virtual:uno.css`, and Flowup combines imports in a grouped editor build. Preact TSX uses `@preact/preset-vite` with an explicit `include` list; the package manager resolves its Babel peer dependency. Preact and Solid children get their own `tsconfig.json` with `jsxImportSource`; run the generated `pnpm typecheck` script. Keep the mount root's `data-flowup-scope` value equal to the package scope. Add the same attribute to the root of any teleported overlay outside that container.

Production editor output uses Vite's default minification and inlines the client script and CSS into the group's Node-RED HTML. Imports used by multiple entries in one group can be deduplicated by that build. Nodes and plugins are separate Node-RED groups and produce separate HTML outputs, so overlapping framework code and utility CSS can be repeated between them; Flowup does not currently extract a cross-group browser asset.

The preset scopes generated utilities, reset, and theme variables and namespaces generated `@property` names and animation keyframes. It does not isolate package-authored global CSS or `@font-face`; handle those explicitly if added. Avoid building utility names only through runtime string concatenation; use statically extractable classes or UnoCSS safelist entries.

For detailed UnoCSS setup, use the packaged `flowup-unocss` skill.

Generated framework clients define `$t` in `client/hydrate.ts` using `createClientI18n`. Import `$t` in components and use `$t('label.name')`; the helper calls Node-RED's `RED._` with `<package>/<node-red-entry>:<child-entry>.<key>`. Keep translations in the child's `locales/<locale>/<entry>.json`. Flowup merges catalogs by group at build time so Node-RED serves them under the grouped entry name. Update the namespace in `client/hydrate.ts` if you rename the package or Node-RED entry in `package.json`.

## Configure And Build

Use `flowup.config.ts` as the shared build and assemble configuration entry:

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

Run a complete build before packing or assembling:

```bash
flowup build
```

The complete artifact is `dist/`, including `package.json` and `flowup.manifest.json`. Paths in the config resolve relative to the config file. Runtime and editor overrides must keep the same project root and publish output.

For a local preview, run `flowup dev` from the package root. It completes the build before launching Node-RED and forces `nodesDir` to the built `dist/`. Configure Node-RED through the top-level `nodeRed` field in `flowup.config.ts`: `port`, `host`, `userDir`, `settingsFile`, `flowsFile`, and `safe`. The default `userDir` is `.flowup/node-red` under the package root; `settingsFile` is relative to the config file. The package needs a `node-red` development dependency. The Node-RED process uses the package root as its working directory. Flowup watches source changes, combines events within 250 ms, runs builds serially, and restarts Node-RED once after the last successful build. A failed rebuild leaves the current preview running.
Node-RED's generated `settings.js` is CommonJS. Flowup creates a CommonJS `package.json` in an empty preview `userDir` to prevent an enclosing ESM package from changing its interpretation; an existing `userDir/package.json` is preserved and must not declare `"type": "module"`.

Partial modes are diagnostic only:

```text
--mode runtime -> .flowup/runtime/
--mode editor  -> .flowup/editor/
```

Never publish those directories or use them as input to `assemble --skip-build`.

## Assemble

From a workspace root, build and combine discovered Flowup packages with:

```bash
flowup assemble
```

Useful existing options:

- `--packages <csv>` selects packages by npm name, folder name, or relative path; every selection must match.
- `--skip-build` reuses existing `dist/` artifacts but still validates their manifests and files.
- `--output <path>` overrides the aggregate directory; it must not overlap a source package or component `dist/`.
- `--no-clean` preserves unrelated existing output files while replacing the newly assembled component set.
- `--config <path>` selects a Flowup config; relative assemble paths resolve from that config's directory.

The output is committed only after every component, dependency, entry, and resource passes validation. A failed assemble leaves the previous output unchanged.

## Publish From Package Root

Use the package root for `npm pack` or `npm publish`:

```bash
flowup build
npm pack --dry-run
```

The root `package.json` should publish `dist`, root `resources`, README, and LICENSE. Its Node-RED entries point into `dist/`; the normalized `dist/package.json` exists for Flowup assemble and is not a separate publishing entry.

Do not use `workspace:`, `catalog:`, `file:`, `link:`, or `portal:` protocols in publishable dependency groups. Replace them with registry-compatible versions before building.

## Diagnose Failures

- Missing or unsupported artifact manifest: rebuild every component with the current CLI, without a partial mode.
- Missing runtime or editor output: run `flowup build`, not a single-mode build.
- Package selection mismatch: check every value passed to `--packages` against npm names, directory names, or workspace-relative paths.
- Dependency conflict: align the exact dependency declarations in the source components; assemble does not choose a version automatically.
- Output overlap error: move the aggregate output outside all source packages and their `dist/` directories.
- Resource not found after install: confirm the root package includes `resources/` and use statically identifiable resource URLs supported by the generated templates.

If the task requires changing Flowup commands, build internals, templates, artifact schemas, or tests, treat it as Flowup source development rather than a consumer workflow.
