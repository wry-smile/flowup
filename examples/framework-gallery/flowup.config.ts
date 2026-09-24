import { defineConfig, presetFlowupWind4 } from '@wry-smile/flowup'
import { preact } from '@preact/preset-vite'
import { fileURLToPath } from 'node:url'
import UnoCSS from 'unocss/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import solid from 'vite-plugin-solid'
import vue from '@vitejs/plugin-vue'

const scope = 'framework-gallery'
const sharedAlias = {
  '@': fileURLToPath(new URL('.', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
  '@client-shared': fileURLToPath(new URL('./client-shared', import.meta.url)),
  '@runtime-shared': fileURLToPath(new URL('./runtime-shared', import.meta.url)),
}

export default defineConfig({
  scope,
  nodeRed: { port: 1887 },
  runtime: {
    config: { resolve: { alias: sharedAlias } },
  },
  client: {
    config: {
      resolve: { alias: sharedAlias },
      build: {
        minify: false,
        cssMinify: false,
      },
    },
    plugins: [
      UnoCSS({ presets: [presetFlowupWind4({ scope })] }),
      preact({
        include: [
          '**/nodes/preact-node/client/**/*.{jsx,tsx}',
          '**/plugins/gallery-plugin/client/**/*.{jsx,tsx}',
        ],
      }),
      vue(),
      svelte(),
      solid({
        include: ['**/nodes/solid-node/client/**/*.{jsx,tsx}'],
      }),
    ],
  },
})
