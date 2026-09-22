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
  --tailwind \
  --non-interactive
```

Use a kebab-case name beginning with a letter. Valid examples include `my-node` and `sensor2`; path separators, `..`, uppercase letters, and an existing target directory are rejected.

Supported package types are `node` and `plugin`. Supported client frameworks are `vanilla`, `vue`, and `svelte`; Tailwind applies only to Vue and Svelte templates.

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
