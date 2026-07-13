# Flowup CLI

Flowup 是一个面向 Node-RED 节点与插件的 CLI，提供模板生成、构建与组装分发能力，底层构建流程基于 Vite。

英文文档: [README.md](./README.md)

## 命令

### `flowup gen`

在当前目录下生成一个新的 Node-RED 节点或插件模板。

```bash
flowup gen --type node --name my-special-node
```

支持参数：

- `--type <node|plugin>`
- `--name <kebab-case>`
- `--locales <csv>`
- `--framework <vanilla|svelte|vue>`
- `--vue [bool]`
  兼容旧用法，推荐改用 `--framework`
- `--tailwind [bool]`
- `--non-interactive`

如果缺少必填参数，Flowup 会自动进入交互式模式。

### `flowup build`

根据当前包中的 `flowup.config.ts` 或 `vite.config.ts` 执行构建。

```bash
flowup build
```

等价于顺序执行：

```bash
vite build --mode runtime
vite build --mode editor
```

支持参数：

- `--cwd <path>`
- `--config <path>`
- `--mode <all|runtime|editor>`

### `flowup assemble`

将所有由 Flowup 构建的 Node-RED 节点或插件组装成一个可分发的总包。

- 在 monorepo 中，会从 workspace 根目录开始扫描
- 非 monorepo 场景下，会从当前执行目录开始扫描

```bash
flowup assemble
```

默认会从 `flowup.config.ts` 中读取 assemble 配置。

推荐写法：

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  assemble: {
    output: 'dist/node-red-assemble',
    name: 'node-red-my-assemble',
    version: '1.0.0',
    packages: ['packages/nodes/foo', 'packages/plugins/bar'],
    skipBuild: false,
  },
})
```

支持参数：

- `--cwd <path>`
- `--config <path>`
- `--output <path>`
- `--name <name>`
- `--version <version>`
- `--description <text>`
- `--author <author>`
- `--license <license>`
- `--packages <csv>`
- `--no-clean`
- `--skip-build`

## 配置

`flowup.config.ts` 是 `build` 与 `assemble` 共用的配置入口。

节点包常见配置：

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-node',
  type: 'nodes',
})
```

插件包常见配置：

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-plugin',
  type: 'plugins',
})
```

## 说明

- 生成的模板会保持 Node-RED 友好的目录结构
- `build` 基于 Vite 的双模式构建 `runtime` 与 `editor`
- `assemble` 会聚合各包 `dist/` 产物并生成总 `package.json`
- `.ts` 配置文件通过 Vite runner 加载，不需要额外再引入 `tsx` 执行链

## Client SDK

`@wry-smile/flowup/client` 提供可复用的 Node-RED editor 客户端能力：

- `createHydrateStore(...)`
- `createVueHydrateStore(...)`
- `createTailwindcssBridge(...)`

不同框架模板会自动生成对应的接线文件，例如 `client/hydrate.ts`、`client/useTailwind.ts`。
