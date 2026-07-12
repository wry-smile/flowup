# Flowup CLI

当前已恢复 `flowup gen` 与 `flowup build`。

## Commands

### `flowup gen`

在当前目录生成一个新的 Node-RED 节点或插件模板：

```bash
flowup gen --type node --name my-special-node
```

支持参数：

- `--type <node|plugin>`
- `--name <kebab-case>`
- `--locales <csv>`
- `--vue [bool]`
- `--tailwind [bool]`
- `--non-interactive`

未提供完整参数时会进入交互式收集。

### `flowup build`

使用当前包的 `vite.config.ts` 作为入口，按顺序执行：

```bash
flowup build
```

等价于依次跑：

```bash
vite build --mode runtime
vite build --mode editor
```

支持参数：

- `--cwd <path>`
- `--config <path>`
- `--mode <all|runtime|editor>`

## Notes

- 生成目录结构与旧版 `flowup gen` 保持一致
- `build` 现在基于 `vite.config.ts` 双模式构建

## Client SDK

`@wry-smile/flowup/client` 提供可直接在 Node-RED editor 客户端里复用的能力：

- `createHydrateStore(...)`
- `createVueHydrateStore(...)`
- `createTailwindcssBridge(...)`

Vue + Tailwind 模板会自动生成对应的接线文件，例如 `client/hydrate.vue.ts` 与 `client/useTailwind.ts`。
