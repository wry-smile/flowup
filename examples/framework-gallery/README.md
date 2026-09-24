# Framework gallery

This multi-entry Node-RED package was generated with `flowup gen package` and
`flowup gen add`. It contains one node for every supported client framework and
a Preact sidebar plugin:

| Entry | Framework |
| --- | --- |
| `nodes/vanilla-node` | Vanilla TypeScript |
| `nodes/vue-node` | Vue |
| `nodes/svelte-node` | Svelte |
| `nodes/preact-node` | Preact |
| `nodes/solid-node` | Solid |
| `plugins/gallery-plugin` | Preact |

Generated editor panels demonstrate configuration, reactive behavior,
lifecycle, resources, icons, localization, and overlays. Framework entries use
the Flowup Wind4 preset; Vanilla includes generated fallback CSS.

Browser helpers are shared through `client-shared/showcase.ts`. Runtime tracing
is shared through `runtime-shared/trace.ts`; it uses `nanoid` and `date-fns`,
installed as package dependencies. Each entry includes English and Chinese
Node-RED locale files and a resource badge.

```bash
pnpm install
pnpm build
pnpm dev
```

To add an entry, run `flowup gen add node name --framework vue --unocss` or
`flowup gen add plugin name --framework preact --unocss` from this directory.
The generated `flowup.config.ts` keeps shared aliases and framework plugins in
one root configuration.
