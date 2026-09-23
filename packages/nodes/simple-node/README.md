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

Produces:

- `dist/simple-node.js`
- `dist/simple-node.html`
- `dist/locales/`
- `dist/icons/`
- `dist/resources/`
- `dist/flowup.manifest.json`

## Scoped CSS example and tests

`client/App.vue` composes three small examples: utility cards, an interactive state and variant panel, and a teleported overlay. The overlay carries `data-flowup-scope="simple-node"` so its UnoCSS rules still apply outside the editor DOM subtree. The examples exercise layout, sizing, spacing, typography, color, gradients, borders, rings, shadows, responsive and dark variants, interaction states, arbitrary values, and animation.

```bash
pnpm test
```

The tests check Vue component behavior and inspect the built editor CSS for scoped selectors, theme variables, registered properties, and renamed keyframes. This is a representative compatibility matrix; the utility syntax has an open-ended set of values, so it cannot be exhaustively enumerated in one example.

## Package

Build and pack from the project root:

```bash
pnpm build
npm pack --dry-run
```
