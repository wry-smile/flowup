---
name: flowup-unocss
description: Configure or migrate scoped UnoCSS in Flowup Vue and Svelte Node-RED editors, including generated templates, overlay scopes, and CSS isolation boundaries.
metadata:
  short-description: Scope UnoCSS in Flowup editors
---

# Flowup UnoCSS

Use this skill when a Flowup node or plugin needs atomic styles in a Vue or Svelte editor. For general CLI commands and publishing, use `flowup-consumer`.

## Setup

- Generate a framework client with `flowup gen --framework vue --unocss` or `--framework svelte --unocss`. Vanilla templates do not support this option.
- In an existing client, add `unocss` as a development dependency. Add `UnoCSS({ presets: [presetFlowupWind4({ scope: '<package-name>' })] })` from `unocss/vite` and `@wry-smile/flowup` to the editor Vite plugins. Put UnoCSS before the Svelte plugin.
- Import `virtual:uno.css` from the editor entry and mount the framework app in an element with `data-flowup-scope="<package-name>"`. The attribute value must equal the preset scope.
- Put the same attribute on the root of any overlay teleported outside the editor container.

## Isolation Boundaries

The Flowup preset scopes the CSS it generates: utility selectors, reset, theme variables, `@property` names, and animation keyframes. It does not transform CSS authored outside the preset, including `@font-face` and custom global styles. Handle those styles in the package when needed. Keep utility names visible to UnoCSS extraction or add a safelist for dynamic names.

For migrations from an older editor, follow [the migration guide](../../docs/unocss-migration.md). The generated Vue example is `packages/nodes/simple-node` in the Flowup repository.
