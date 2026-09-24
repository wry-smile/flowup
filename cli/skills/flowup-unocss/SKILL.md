---
name: flowup-unocss
description: Configure scoped UnoCSS in Flowup Vue, Svelte, Preact, and Solid Node-RED editors, including generated templates, overlay scopes, and CSS isolation boundaries.
metadata:
  short-description: Scope UnoCSS in Flowup editors
---

# Flowup UnoCSS

Use this skill when a Flowup node or plugin needs atomic styles in a Vue, Svelte, Preact, or Solid editor. For general CLI commands and publishing, use `flowup-consumer`.

## Setup

- Generate a framework client with `flowup gen --framework vue --unocss`, `--framework svelte --unocss`, `--framework preact --unocss`, or `--framework solid --unocss`. Vanilla templates do not support this option.
- For a manually configured client, install a compatible `unocss` version in the package. Import `UnoCSS` from `unocss/vite` and `presetFlowupWind4` from `@wry-smile/flowup`, then add `UnoCSS({ presets: [presetFlowupWind4({ scope })] })` to `client.plugins` before framework plugins. Reuse the same `scope` constant in `defineConfig`.
- Each generated UnoCSS client imports `virtual:uno.css`. In generated multi-entry packages, `gen add` updates `flowup.config.ts` after every new entry. Flowup combines these imports during a grouped build. Mount each app in an element with `data-flowup-scope="<package-name>"`. The attribute value must equal the config scope.
- Put the same attribute on the root of any overlay teleported outside the editor container.

## Isolation Boundaries

The Flowup preset scopes the CSS it generates: utility selectors, reset, theme variables, `@property` names, and animation keyframes. It does not transform CSS authored outside the preset, including `@font-face` and custom global styles. Handle those styles in the package when needed. Keep utility names visible to UnoCSS extraction or add a safelist for dynamic names.

`presetFlowupWind4` accepts utilities referencing CSS variables with the form `bg-(--fui-surface)`, `rounded-(--fui-radius)`, or `hover:text-(--fui-accent)`. Its variant rewrites these to Wind4 arbitrary values while preserving the original class selector and the Flowup scope. Component themes are installed with `flowup gen component` into a SolidJS package that uses UnoCSS. Their `theme.css` defines 24 `--fui-*` tokens under the package's exact `data-flowup-scope` value; override tokens on that root or add `data-fui-theme="dark"` to use the included dark palette. State selectors use `data-fui-status` and `data-fui-tone` inside that same scope.

The production editor build uses Vite's default minification and inlines the generated CSS into each group's editor HTML. Utility rules can be shared within a nodes group or a plugins group build; nodes and plugins are separate builds, so the same rules may appear in both outputs.
