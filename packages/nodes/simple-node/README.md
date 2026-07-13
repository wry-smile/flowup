# simple-node

A Node-RED custom node scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

- Plain HTML + TypeScript (no UI framework)

## Client Helpers

- `@wry-smile/flowup/client` 提供通用的 hydrate store 与 Tailwind Shadow DOM bridge
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


## 可选:Vue / Tailwindcss

本脚手架默认是纯 HTML + TypeScript,不依赖任何 UI 框架。

如果你之后想加 Vue 或 Tailwindcss:

```bash
pnpm add -D @vitejs/plugin-vue @tailwindcss/vite
```

然后在 `flowup.config.ts` 里手动 import + 注入 plugin:

```ts
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  scope: 'simple-node',
  client: { plugins: [vue(), tailwindcss()] },
})
```

