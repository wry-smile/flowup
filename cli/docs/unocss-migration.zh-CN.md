# 将 editor 迁移到带作用域的 UnoCSS

Flowup 的 Vue 和 Svelte editor 作为普通框架应用挂载。`--unocss` 使用 UnoCSS Wind4，并把生成的工具类限定在 `data-flowup-scope` 下，使多个 Node-RED 包可以共用 editor 页面而不会共用这些工具类规则。

## 新建包

```bash
flowup gen --type node --name my-node --framework vue --unocss --non-interactive
```

插件可用 `--type plugin`，Svelte 模板可用 `--framework svelte`。生成的项目已经包含 Vite 插件、`virtual:uno.css` 导入、带作用域的挂载元素和 `unocss` 开发依赖。

## 迁移已有包

1. 将脚本里的 `--tailwind` 改成 `--unocss`，`FLOWUP_GEN_TAILWIND` 改成 `FLOWUP_GEN_UNOCSS`；旧名称已移除。
2. 安装 `unocss` 开发依赖，并移除 editor 不再使用的 Tailwind 依赖。
3. 在 editor 的 Vite 插件中配置 Flowup 预设：

   ```ts
   import { presetFlowupWind4 } from '@wry-smile/flowup'
   import UnoCSS from 'unocss/vite'

   // 放入 editor 构建的 Vite plugins：
   UnoCSS({ presets: [presetFlowupWind4({ scope: 'my-node' })] })
   ```

   Svelte 项目应将 UnoCSS 放在 Svelte 插件之前。这里的 `scope` 必须与挂载元素一致。

4. 在 editor 入口导入 `virtual:uno.css`，把 Vue 或 Svelte 应用挂载到带有 `data-flowup-scope="my-node"` 的元素。移除 Shadow DOM 样式桥接，直接挂载框架应用。旧的 `@wry-smile/flowup/client` 导出 `createTailwindcssBridge`、`getStyleSheet` 和 `TailwindBridgeOptions` 已移除。
5. 如果弹出层传送到 editor 容器外，在弹出层根元素添加相同的 scope 属性。工具类名称应能从源码静态提取；动态名称可以配置 UnoCSS safelist。

预设会隔离自己生成的工具类选择器、reset、主题变量、`@property` 名称和动画关键帧。手写的全局 CSS 与 `@font-face` 不会自动转换，使用时需单独检查。生成的 UnoCSS 样式不需要额外配置 PostCSS。

Vue editor 示例见 [`simple-node`](https://github.com/wry-smile/flowup/tree/main/packages/nodes/simple-node)。迁移后运行 `flowup build`；如果包中有自定义全局样式，还需检查生成的 editor CSS。
