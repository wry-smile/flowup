import type { PluginOption, UserConfig } from 'vite'
import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file'
import { mergeConfig } from 'vite'
import { defineClientConfig } from './client'
import { viteSingleFile } from './plugins/single-file'
import { defineRuntimeConfig } from './runtime'

export type { CopyTask } from './plugins/copy-file'
export type { SingleFilePluginOptions, TailwindcssPluginOptions, VuePluginOptions } from './types'

export interface DefineConfigOptions {
  runtime?: UserConfig
  client?: UserConfig
  /** node-red 节点类型,等同文件名 scope */
  scope: string
  /**
   * 启用 @vitejs/plugin-vue(单文件 .vue 组件)。
   *
   * - `false`(默认):不启用,client 走纯 TS/HTML。子包无需安装 @vitejs/plugin-vue。
   * - `true`:启用,走默认配置。子包 devDependencies 需装 `@vitejs/plugin-vue`。
   * - `VuePluginOptions`:自定义插件选项。
   */
  vuePlugin?: boolean | import('./types').VuePluginOptions
  /**
   * 启用 cli 内置的 inline-html 插件(把 editor bundle 内联成一个 .html)。
   *
   * - `false`(默认):不启用,client 走 vite 默认多 chunk 产物。
   * - `true`/`SingleFilePluginOptions`:启用 cli 自研的 inline 逻辑,
   *   无需任何外部包(纯 Rollup hook 实现)。
   *
   * 注:`flowup build` 本身就是「editor → 单个 <scope>.html」的目标,
   * 业务上几乎总会启用;但保持 opt-in 是为了在 monorepo 某些子包
   * (如纯服务端插件)里不浪费 bundle 时间。
   */
  singleFilePlugin?: boolean | import('./types').SingleFilePluginOptions
  /**
   * 启用 @tailwindcss/vite。
   *
   * - `false`(默认):不启用。
   * - `true`/`TailwindcssPluginOptions`:启用,需装 `@tailwindcss/vite`
   *   并在 client/editor.html 引入 tailwind 产物。
   */
  tailwindcssPlugin?: boolean | import('./types').TailwindcssPluginOptions
  /** 自定义 copy 任务,会追加到 Node-RED 资源约定拷贝之后 */
  copyTask?: CopyTask[]
  /** 关闭/开启 Node-RED 资源约定扫描,默认全开 */
  resources?: ResourceDefaults
}

export type ResolvedConfig = Required<Omit<DefineConfigOptions, 'vuePlugin' | 'singleFilePlugin' | 'tailwindcssPlugin'>>

/**
 * defineConfig —— 同步版本(默认)。
 *
 * 默认三个 vite 插件全关(vue / tailwindcss / singlefile 都不强行启用),
 * 符合「最小化脚手架不需要 vue/tailwindcss」的诉求。cli 自身不依赖
 * @vitejs/plugin-vue / @tailwindcss/vite,这些包由子包按需安装 + 自行
 * 用 client.plugins 注入。
 *
 * 例(纯 HTML/TS node,无需任何额外包):
 * ```ts
 * import { defineConfig } from '@wry-smile/flowup'
 *
 * export default defineConfig({ scope: 'my-node' })
 * ```
 *
 * 例(要 vue + tailwindcss):
 * ```ts
 * import { defineConfig } from '@wry-smile/flowup'
 * import vue from '@vitejs/plugin-vue'
 * import tailwindcss from '@tailwindcss/vite'
 *
 * export default defineConfig({
 *   scope: 'my-node',
 *   client: { plugins: [vue(), tailwindcss()] },
 * })
 * ```
 *
 * 例(用 cli 内置 inline-html 插件,生成单个 <scope>.html):
 * ```ts
 * import { defineConfig } from '@wry-smile/flowup'
 *
 * export default defineConfig({
 *   scope: 'my-node',
 *   singleFilePlugin: true,
 * })
 * ```
 */
export function defineConfig(
  config: DefineConfigOptions,
): ResolvedConfig {
  const {
    runtime = {},
    client = {},
    scope,
    singleFilePlugin = false,
    copyTask = [],
    resources = {},
  } = config

  // single-file 是 cli 内置 Rollup 插件,无外部依赖,直接静态 import。
  // vue / tailwindcss 默认关闭,需要由用户在 client.plugins 里手动注入
  // (因为这两个包 cli 不安装,无法在这里 dynamic import)。
  const extraPlugins: PluginOption[] = []
  if (singleFilePlugin) {
    extraPlugins.push(viteSingleFile(
      {
        removeViteModuleLoader: true,
        removeModuleType: true,
        ...(typeof singleFilePlugin === 'boolean' ? undefined : singleFilePlugin),
      },
    ))
  }

  return {
    scope,
    copyTask,
    resources,
    runtime: mergeConfig(
      defineRuntimeConfig({ scope }),
      runtime,
    ),
    client: mergeConfig(
      defineClientConfig({
        scope,
        copyTask,
        resources,
        plugins: extraPlugins,
      }),
      client,
    ),
  }
}
