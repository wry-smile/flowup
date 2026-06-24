import type { UserConfig } from 'vite'
import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file.plugin'
import { mergeConfig } from 'vite'
import { defineClientConfig } from './client'
import { defineRuntimeConfig } from './runtime'

export type { CopyTask } from './plugins/copy-file.plugin'
export type { SingleFilePluginOptions, TailwindcssPluginOptions, VuePluginOptions } from './types/plugin'

export interface DefineConfigOptions {
  runtime?: UserConfig
  client?: UserConfig
  /** node-red 节点类型,等同文件名 scope */
  scope: string
  vuePlugin?: boolean | import('./types/plugin').VuePluginOptions
  singleFilePlugin?: boolean | import('./types/plugin').SingleFilePluginOptions
  tailwindcssPlugin?: boolean | import('./types/plugin').TailwindcssPluginOptions
  /** 自定义 copy 任务,会追加到 Node-RED 资源约定拷贝之后 */
  copyTask?: CopyTask[]
  /** 关闭/开启 Node-RED 资源约定扫描,默认全开 */
  resources?: ResourceDefaults
}

export function defineConfig(config: DefineConfigOptions): Required<DefineConfigOptions> {
  const {
    runtime = {},
    client = {},
    scope,
    vuePlugin = true,
    singleFilePlugin = true,
    tailwindcssPlugin = true,
    copyTask = [],
    resources = {},
  } = config ?? {}

  return {
    scope,
    vuePlugin,
    singleFilePlugin,
    tailwindcssPlugin,
    copyTask,
    resources,
    runtime: mergeConfig(
      defineRuntimeConfig({ scope }),
      runtime,
    ),
    client: mergeConfig(
      defineClientConfig({ scope, copyTask, resources }),
      client,
    ),
  }
}
