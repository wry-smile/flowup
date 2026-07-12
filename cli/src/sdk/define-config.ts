import type { PluginOption, UserConfig, UserConfigFnObject } from 'vite'
import path from 'node:path'
import process from 'node:process'
import { mergeConfig, defineConfig as viteDefineConfig } from 'vite'
import { flowupClientHtmlEntryPlugin } from './plugins/client-html-entry'
import { flowupPackagePlugin } from './plugins/package'
import { flowupStaticAssetsPlugin } from './plugins/static-assets'

export interface FlowupConfig {
  scope: string
  type?: 'nodes' | 'plugins'
  root?: string
  outDir?: string
  runtime?: {
    entry?: string
    config?: UserConfig
  }
  client?: {
    entry?: string
    template?: string
    plugins?: PluginOption[]
    config?: UserConfig
  }
  package?: {
    extra?: Record<string, unknown>
  }
}

export function defineConfig(config: FlowupConfig): UserConfigFnObject {
  const root = path.resolve(config.root ?? process.cwd())
  const outDir = path.resolve(root, config.outDir ?? 'dist')
  const runtimeEntry = path.resolve(root, config.runtime?.entry ?? 'runtime/index.ts')
  const clientEntry = path.resolve(root, config.client?.entry ?? 'client/index.ts')
  const clientTemplate = path.resolve(root, config.client?.template ?? 'client/editor.html')

  return viteDefineConfig(({ mode }): UserConfig => {
    switch (mode) {
      case 'runtime':
        return mergeConfig({
          build: {
            outDir,
            emptyOutDir: true,
            minify: false,
            rolldownOptions: {
              platform: 'node',
              input: {
                [config.scope]: runtimeEntry,
              },
              preserveEntrySignatures: 'strict',
              output: {
                format: 'commonjs',
                codeSplitting: false,
                entryFileNames: '[name].js',
              },
            },
          },
        }, config.runtime?.config ?? {})

      case 'editor':
        return mergeConfig({
          build: {
            outDir,
            emptyOutDir: false,
            cssCodeSplit: false,
            minify: false,
            rolldownOptions: {
              platform: 'browser',
              input: {
                [config.scope]: clientEntry,
              },
              output: {
                format: 'iife',
                codeSplitting: false,
                entryFileNames: '[name].js',
              },
            },
          },
          plugins: [
            ...(config.client?.plugins ?? []),
            flowupPackagePlugin({
              cwd: root,
              name: config.scope,
              type: config.type ?? 'nodes',
              extra: config.package?.extra,
            }),
            flowupClientHtmlEntryPlugin({
              name: config.scope,
              template: clientTemplate,
            }),
            flowupStaticAssetsPlugin({
              cwd: root,
              dirs: ['icons', 'resources', 'locales'],
            }),
          ],
        }, config.client?.config ?? {})

      default:
        throw new Error(`Unsupported build mode: ${mode}. Please use "runtime" or "editor".`)
    }
  })
}
