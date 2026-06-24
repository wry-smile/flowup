import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
    },
    format: ['esm'],
    external: [
      'vite',
      '@tailwindcss/vite',
      '@vitejs/plugin-vue',
      'vite-plugin-singlefile',
      '@clack/prompts',
      'commander',
      'plop',
      'micromatch',
      'find-up',
      'js-yaml',
    ],
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  },
  {
    entry: {
      'bin/flowup': './bin/flowup.ts',
    },
    format: ['esm'],
    external: ['vite', '@clack/prompts', 'commander', 'js-yaml', 'find-up'],
    dts: false,
    outExtensions: () => ({ js: '.js' }),
    outputOptions: {
      // 让 dist/ 反映 entry 里的 bin/ 前缀,产物落在 dist/bin/flowup.js
    },
  },
])
