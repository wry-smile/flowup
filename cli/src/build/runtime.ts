import type { UserConfig } from 'vite'

export interface RuntimeConfigOptions {
  entry?: string
  scope?: string
}

export function defineRuntimeConfig(options: RuntimeConfigOptions): UserConfig {
  const { entry, scope } = options
  return {
    build: {
      minify: true,
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        // 相对路径,让 vite 拿 build() 时的 root 来 resolve,
        // 这样 buildEntry 传入 cwd 时能找到正确的子包 runtime 入口
        entry: entry ?? 'runtime/index.ts',
        formats: ['cjs'],
        fileName: () => (scope ? `${scope}.js` : 'runtime.js'),
      },
      rollupOptions: {
        output: {
          exports: 'default',
        },
      },
    },
  }
}
