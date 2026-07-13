import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
      client: './src/client/index.ts',
    },
    format: ['esm'],
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  },
  {
    entry: {
      'bin/flowup': './bin/flowup.ts',
    },
    format: ['esm'],
    dts: false,
    outExtensions: () => ({ js: '.js' }),
  },
])
