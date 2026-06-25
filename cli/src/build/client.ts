import type { PluginOption, UserConfig } from 'vite'
import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file'
import { viteConventionCopyPlugin } from './plugins/copy-file'

export interface ClientConfigOptions {
  scope: string
  /**
   * 已加载好的 vite plugin 列表(由 defineConfig 在动态 import 之后传入)。
   * 这里只接受「plugin 实例」,不再接受 options —— 避免 client 层需要 import 三个可选包。
   */
  plugins?: PluginOption[]
  copyTask?: CopyTask[]
  resources?: ResourceDefaults
}

export function defineClientConfig(options: ClientConfigOptions): UserConfig {
  const {
    plugins: externalPlugins = [],
    copyTask = [],
    resources = {},
  } = options

  // 资源约定扫描推迟到 vite plugin buildStart 阶段,那时 process.cwd() 已经是子包根
  const plugins: PluginOption[] = [
    viteConventionCopyPlugin({ tasks: copyTask, resources }),
    ...externalPlugins,
  ]

  return {
    plugins,
    build: {
      minify: false,
      emptyOutDir: false,
      outDir: 'dist',
      // 我们自己用 RollupOutput 拿 HTML 写盘,不需要 Vite 落地
      write: false,
      rollupOptions: {
        input: 'client/editor.html',
      },
    },
  }
}
