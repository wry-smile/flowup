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

Supported package types are `node` and `plugin`. Supported client frameworks are `vanilla`, `vue`, and `svelte`; scoped UnoCSS applies only to Vue and Svelte templates.

## Scoped Framework Styles

Vue and Svelte templates mount as ordinary framework apps. With `--unocss`, the generated `flowup.config.ts` adds `UnoCSS({ presets: [presetFlowupWind4({ scope: '<package-name>' })] })`, and the client imports `virtual:uno.css`. Keep the mount root's `data-flowup-scope` value equal to the preset scope. Add the same attribute to the root of any teleported overlay outside that container.

The preset scopes generated utilities, reset, and theme variables and namespaces generated `@property` names and animation keyframes. It does not isolate package-authored global CSS or `@font-face`; handle those explicitly if added. Avoid building utility names only through runtime string concatenation; use statically extractable classes or UnoCSS safelist entries. See `packages/nodes/simple-node` for a Vue example and scoped CSS tests.

For migrations from an existing scoped editor or detailed UnoCSS setup, use the packaged `flowup-unocss` skill and `docs/unocss-migration.md`.

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
