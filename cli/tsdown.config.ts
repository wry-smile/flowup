import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
    },
    format: ['esm'],
    deps: {
      neverBundle: [
        // cli 自身的运行时依赖 —— 必须 external(用户装 cli 时已经带上)
        'vite',
        '@clack/prompts',
        'commander',
        'micromatch',
        'find-up',
        'js-yaml',
        // cli 的 peer (optional) 依赖 —— 用户在子包按需装,cli 不 bundle
        '@tailwindcss/vite',
        '@vitejs/plugin-vue',
      ],
    },
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  },
  {
    entry: {
      'bin/flowup': './bin/flowup.ts',
    },
    format: ['esm'],
    deps: {
      neverBundle: ['vite', '@clack/prompts', 'commander', 'js-yaml', 'find-up'],
    },
    dts: false,
    outExtensions: () => ({ js: '.js' }),
  },
])
