# Framework gallery

This package was created with `flowup gen package framework-gallery` and six `flowup gen add` commands. It demonstrates one Node-RED package with five nodes and one sidebar plugin.

| Entry | Client | Demonstrates |
| --- | --- | --- |
| `vanilla-node` | Vanilla | Native Node-RED form, translated labels, resource URL |
| `vue-node` | Vue | Composition API, reactive form, list and conditional content |
| `svelte-node` | Svelte | Stores, event handling, conditional content |
| `preact-node` | Preact | Hooks, selectable tones, expandable feature list |
| `solid-node` | Solid | Signals, `For`, `Show`, scoped portal overlay |
| `gallery-plugin` | Preact | Sidebar tab, search filter, shared browser module |

All framework clients use scoped UnoCSS. Utility samples cover layout, responsive variants, dark variants, hover/focus states, borders, rings, transitions, and overlays. The client bundle shares `client-shared/showcase.ts`; node runtimes share `runtime-shared/trace.ts`, which uses `nanoid` and `date-fns` installed with `pnpm add`.

Each entry includes English and Chinese Node-RED catalogs, a node help file, a palette icon, and `resources/<entry>/badge.svg` plus `example.json`. The build places icons in `dist/icons/` with entry-prefixed filenames, resources in `dist/resources/<entry>/`, and merges each locale's catalogs and help into `dist/locales/<locale>/framework-gallery-{nodes,plugins}.{json,html}` so Node-RED can load them through the grouped entry names.

Framework components import `t` from their `client/i18n.ts` and call `t('label.name')`. The helper uses the Node-RED package and grouped entry name as its translation namespace.

```bash
pnpm install
pnpm --filter flowup-framework-gallery build
pnpm --filter flowup-framework-gallery dev
```

To add another entry, run `flowup gen add node name --framework preact --unocss` in this directory. The command updates dependencies and prints setup guidance. This gallery has a customized `flowup.config.ts`, so add any new framework entry to that file manually. Child editors import `virtual:uno.css` directly; Flowup deduplicates those imports when bundling a group. `pnpm typecheck` checks each TSX child's own JSX configuration. Shared code imports use the root `@client-shared` and `@runtime-shared` aliases.
