# simple-node

A Node-RED custom node scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

- **Vue** (SFC, .vue files)
- **UnoCSS Wind4** (scoped atomic CSS)

## Client Helpers

- `@wry-smile/flowup/client` 提供通用的 hydrate store
- Vue 模板会生成 `client/hydrate.ts`
- UnoCSS 样式限定在 `data-flowup-scope` 容器内；弹出层挂载节点也需设置相同属性
- 可复用常量会生成到 `constant/index.ts`

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

```bash
pnpm install
pnpm build
```

## Preview in Node-RED

```bash
pnpm dev
```

Flowup builds the package and starts Node-RED with `nodesDir` pointing at
`dist/`. Source changes trigger a rebuild and one restart after the final
successful build. Configure the preview with `nodeRed` in `flowup.config.ts`.

Produces:

- `dist/simple-node.js`
- `dist/simple-node.html`
- `dist/locales/`
- `dist/icons/`
- `dist/resources/`
- `dist/flowup.manifest.json`

## Package

Build and pack from the project root:

```bash
pnpm build
npm pack --dry-run
```
