import { defineConfig } from 'tsdown'
import Raw from 'unplugin-raw/rolldown'

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
      internal: './src/internal.ts',
      client: './src/client/index.ts',
      'client/preact': './src/client/preact.ts',
      'client/solid': './src/client/solid.ts',
      'client/svelte': './src/client/svelte.ts',
      'client/vue': './src/client/vue.ts',
    },
    format: ['esm'],
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    plugins: [Raw()],
  },
  {
    entry: {
      'bin/flowup': './bin/flowup.ts',
    },
    format: ['esm'],
    dts: false,
    outExtensions: () => ({ js: '.js' }),
    plugins: [Raw()],
  },
])
