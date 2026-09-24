# simple-plugin

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

- Vue sidebar plugin

- UnoCSS Wind4 with a Flowup scope


- `@wry-smile/flowup/client` provides the shared hydrate store.

- Vue templates include `client/hydrate.ts`.



- UnoCSS styles are scoped to `data-flowup-scope`; popup mount nodes need the same attribute.

- Shared constants are generated in `constant/index.ts`.

## Layout

```
simple-plugin/
├── package.json
├── flowup.config.ts
├── constant/
├── runtime/
├── client/
├── types/
├── locales/
├── icons/
└── resources/
```

## Build and Package

```
pnpm install
pnpm build
npm pack --dry-run
```

Run `pnpm dev` to build and preview this plugin in Node-RED. Source changes rebuild the package and restart Node-RED. The preview uses `dist/` as `nodesDir`; configure it with `nodeRed` in `flowup.config.ts`.

A full build generates `dist/flowup.manifest.json` for `flowup assemble`.
