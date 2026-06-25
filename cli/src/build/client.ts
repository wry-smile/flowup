import type { PluginOption, UserConfig } from 'vite'
import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { viteConventionCopyPlugin } from './plugins/copy-file'
import { viteSingleFile } from './plugins/single-file'

export interface ClientConfigOptions {
  scope: string
  copyTask?: CopyTask[]
  vuePlugin?: boolean | import('./types').VuePluginOptions
  singleFilePlugin?: boolean | import('./types').SingleFilePluginOptions
  tailwindcssPlugin?: boolean | import('./types').TailwindcssPluginOptions
  resources?: ResourceDefaults
}

export function defineClientConfig(options: ClientConfigOptions): UserConfig {
  const {
    vuePlugin = true,
    singleFilePlugin = true,
    tailwindcssPlugin = true,
    copyTask = [],
    resources = {},
  } = options

  // 资源约定扫描推迟到 vite plugin buildStart 阶段,那时 process.cwd() 已经是子包根
  const plugins: PluginOption[] = [
    viteConventionCopyPlugin({ tasks: copyTask, resources }),
  ]

  if (vuePlugin) {
    plugins.push(vue(typeof vuePlugin === 'boolean' ? undefined : vuePlugin))
  }
  if (tailwindcssPlugin) {
    plugins.push(tailwindcss(typeof tailwindcssPlugin === 'boolean' ? undefined : tailwindcssPlugin))
  }
  if (singleFilePlugin) {
    plugins.push(viteSingleFile(
      {
        removeViteModuleLoader: true,
        removeModuleType: true,
        ...(typeof singleFilePlugin === 'boolean' ? undefined : singleFilePlugin),
      },
    ))
  }

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
