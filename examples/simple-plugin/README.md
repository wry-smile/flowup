# simple-plugin

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

- Vue sidebar plugin
- UnoCSS Wind4 with a Flowup scope

- `@wry-smile/flowup/client` 提供通用的 hydrate store
- Vue 模板会生成 `client/hydrate.ts`
- UnoCSS 样式限定在 `data-flowup-scope` 容器内；弹出层挂载节点也需设置相同属性
- 可复用常量会生成到 `constant/index.ts`

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

```bash
pnpm install
pnpm build
npm pack --dry-run
```

Run `pnpm dev` to build and preview this plugin in Node-RED. Source changes
rebuild the package and restart Node-RED. The preview uses `dist/` as
`nodesDir`; configure it with `nodeRed` in
`flowup.config.ts`.

A full build generates `dist/flowup.manifest.json` for `flowup assemble`.
