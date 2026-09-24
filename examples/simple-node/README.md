# simple-node

A Node-RED custom node scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

- **Vue** (SFC, .vue files)

- **UnoCSS Wind4** (scoped atomic CSS)


## Client Helpers

- `@wry-smile/flowup/client` provides the shared hydrate store.

- Vue templates include `client/hydrate.ts`.



- UnoCSS styles are scoped to `data-flowup-scope`; popup mount nodes need the same attribute.

- Shared constants are generated in `constant/index.ts`.

## Layout

```
simple-node/
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

## Build

```
pnpm install
pnpm build
```

## Preview in Node-RED

```
pnpm dev
```

Flowup builds the package and starts Node-RED with `nodesDir` pointing at `dist/`. Source changes trigger a rebuild and one restart after the final successful build. Configure the preview with `nodeRed` in `flowup.config.ts`.

Produces `dist/simple-node.js`, `dist/simple-node.html`, locales, icons, resources, and `flowup.manifest.json`.

## Package

```
pnpm build
npm pack --dry-run
```
