import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
    },
    format: ['esm'],
    deps: {
      neverBundle: [
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
