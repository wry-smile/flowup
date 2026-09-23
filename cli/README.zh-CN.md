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
- `--unocss [bool]`：在 Vue 或 Svelte 模板中启用带作用域的 UnoCSS
- `--non-interactive`

如果缺少必填参数，Flowup 会自动进入交互式模式。

生成带作用域原子样式的 Vue 节点：

```bash
flowup gen --type node --name my-node --framework vue --unocss --non-interactive
```

插件也可使用相同参数，或将框架改为 `--framework svelte`。生成的 Vue 和 Svelte
客户端会作为普通框架应用挂载，不再构建为 Web Component，也不使用 Shadow DOM。
`--unocss` 会安装 UnoCSS Wind4，并在 `flowup.config.ts` 中配置
`presetFlowupWind4({ scope: 'my-node' })`。
已有项目请参阅 [UnoCSS 迁移指南](./docs/unocss-migration.zh-CN.md)。

### `flowup build`

根据当前包中的 `flowup.config.ts` 或 `vite.config.ts` 执行构建。

```bash
flowup build
```

默认的 `all` 模式会将 runtime 与 editor 作为同一个事务执行：先写入临时同级目录，
只有 runtime、editor、包元数据和 artifact manifest 全部通过校验后才替换 `dist/`。

```bash
flowup build --mode all
```

生成的 `dist/flowup.manifest.json` 是 `flowup assemble` 消费的产物契约。
仅用于开发诊断的 `runtime` 和 `editor` 模式分别写入 `.flowup/runtime/` 与
`.flowup/editor/`，不会修改可发布的 `dist/`。

支持参数：

- `--cwd <path>`
- `--config <path>`
- `--mode <all|runtime|editor>`

### `flowup dev`

先完整构建当前包，再启动 Node-RED editor，并将 `nodesDir` 指向本次生成的
`dist/`。随后会监听源码，重新构建成功后重启 Node-RED。命令会持续运行，直到手动停止。新生成的 node/plugin 包包含 `dev` 脚本
和 Node-RED 开发依赖。

```bash
pnpm dev
# 或：flowup dev --cwd packages/nodes/my-node
```

可在 `flowup.config.ts` 中配置预览：

```ts
import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'my-node',
  nodeRed: {
    port: 1880,
    host: '127.0.0.1',
    userDir: '.flowup/node-red',
    // settingsFile: 'node-red/settings.cjs',
    // flowsFile: 'flows.json',
    // safe: true,
  },
})
```

`userDir` 默认是包根目录下的 `.flowup/node-red`，与日常使用的 Node-RED 数据
分开。`settingsFile` 相对配置文件解析，`userDir` 相对包根目录解析。即使自定义
settings 文件设置了 `nodesDir`，预览时也会使用本次构建的 `dist/`。
如果预览 `userDir` 尚无 `package.json`，Flowup 会创建 CommonJS 包边界，确保
Node-RED 生成的 `settings.js` 在 `"type": "module"` 的节点包内仍可加载。
已有 `userDir/package.json` 会保留，但不能设置 `"type": "module"`。
自定义 settings 文件若位于 ESM 包内，请使用 `.cjs` 扩展名。
如果包内尚未安装 `node-red`，需将其加入开发依赖。`--cwd` 和 `--config` 的
路径规则与 `build` 相同。
Node-RED 进程的工作目录是包根目录。监听会排除 `dist/`、配置的 `userDir`、`.flowup/`、
`node_modules/` 和测试目录；250ms 内的变化合并处理，构建串行执行，最后一次
成功构建后只重启一次 Node-RED。构建失败会保留当前预览。更改包根目录配置后
需要重新启动 `flowup dev`。

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

在 workspace 根目录中，默认输出为 `dist/flowup-assemble`。如果扫描根目录本身就是
一个源码包，Flowup 会改用安全的同级目录，避免合包输出与源码或组件 `dist/` 重叠。

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

### UnoCSS 作用域

生成的 editor 会导入 `virtual:uno.css`，并挂载在
`data-flowup-scope="my-node"` 容器内。Flowup Wind4 预设为生成的工具类选择器
增加作用域，将 reset 和主题变量限定在容器内，并为生成的 `@property` 注册项与
动画关键帧使用包专属名称。无需另行配置 PostCSS。

如果组件将弹出层传送到 editor 容器外，请在弹出层根节点添加相同属性：

```html
<div data-flowup-scope="my-node">...</div>
```

工具类名称应能从源码静态提取；动态拼接的名称需要加入 UnoCSS safelist。
预设只处理它生成的 CSS。包内自行编写的全局 CSS（包括 `@font-face`）需自行处理隔离。
Vue 组件和构建产物测试见 [`simple-node`](../packages/nodes/simple-node/README.md)。
专门的配置与迁移流程见随 CLI 发布的
[Flowup UnoCSS SKILL](./skills/flowup-unocss/SKILL.md)。

## 说明

- 生成的模板会保持 Node-RED 友好的目录结构
- `build` 基于 Vite 的双模式构建 `runtime` 与 `editor`
- `dev` 会构建并监听包的变化，成功构建后重启本地 Node-RED 预览
- `assemble` 会聚合各包 `dist/` 产物并生成总 `package.json`
- `assemble` 会先构建并校验全部组件，再原子替换最终输出
- `.ts` 配置文件通过 Vite runner 加载，不需要额外再引入 `tsx` 执行链

## 打包发布

生成项目统一从项目根目录打包。源码 `package.json` 的 Node-RED 入口指向
`dist/<name>.js`，而 `dist/package.json` 使用相对于 `dist/` 的入口，供合包流程使用。
发布清单同时包含 `dist/` 和包根 `resources/`：Node-RED 从 `dist/` 入口的相对目录
加载 runtime、editor、locales 和 icons，但模块 resources 必须位于安装包根目录。

```bash
pnpm build
npm pack --dry-run
```

不要发布仅执行 `runtime` 或 `editor` 模式得到的不完整产物。

发布级验证必须打包并安装真实 tarball，不应只验证 workspace link：

```bash
npm pack
npm install ./flowup-my-node-1.0.0.tgz
```

生成包默认包含 README、MIT LICENSE、非空描述、Node-RED keywords 和完整发布文件清单。
发布自己的包前应补充 author、repository 等归属信息。

## 兼容性与发布检查

Flowup CLI 要求 Node.js `^20.19.0 || >=22.12.0`。生成的运行时包会在 CI 中验证
Node-RED 4 和 Node-RED 5。

仓库发布门禁：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm check:examples
pnpm test:e2e
pnpm check
```

`pnpm test:e2e` 会安装真实 CLI tarball，在空目录生成 node/plugin，完成 build、
assemble、组件包与合包的 npm pack，再将 tarball 安装到隔离 Node-RED userDir，
验证 runtime 与 HTTP resources。

## 从早期 2.x 产物迁移

升级 CLI 后，应删除旧 `dist/` 并重新执行完整 `flowup build`，不要复用仅包含
runtime 或 editor 的旧产物。组件包从项目根目录执行 `npm pack`；合包则直接在
`assemble` 输出目录打包。合包中的组件目录名属于 Node-RED 入口路径的一部分，
打包前不要手动移动或改名。

## 故障排查

- `assemble --skip-build` 报缺少或不支持的 manifest：使用当前 CLI 对所有组件重新执行完整构建。
- 安装后 `/resources/<package>/...` 返回 404：确认组件包的 npm `files` 同时包含 `dist` 和根目录 `resources`。
- workspace 可加载但 tarball 安装失败：对真实 `.tgz` 执行安装验证，并检查 tarball 中不存在 `workspace:` 或 `catalog:` 依赖。
- 合包安装后找不到 node/plugin：不要移动合包内组件目录，重新执行 `assemble` 后直接打包输出目录。

## Client SDK

`@wry-smile/flowup/client` 提供可复用的 Node-RED editor 客户端能力：

- `createHydrateStore(...)`
- `createVueHydrateStore(...)`

Vue 和 Svelte 模板使用 `presetFlowupWind4({ scope })`，挂载在
`data-flowup-scope` 容器内。Flowup 负责该预设生成的样式作用域；用户自行编写的全局 CSS 由用户管理。
