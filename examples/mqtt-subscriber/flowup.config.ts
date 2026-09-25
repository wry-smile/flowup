import { defineConfig, presetFlowupWind4 } from '@wry-smile/flowup'
import { fileURLToPath } from 'node:url'
import UnoCSS from 'unocss/vite'
import solid from 'vite-plugin-solid'

const scope = 'mqtt-subscriber'
const sharedAlias = {
  '@': fileURLToPath(new URL('.', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
  '@client-shared': fileURLToPath(new URL('./client-shared', import.meta.url)),
  '@ui': fileURLToPath(new URL('./components', import.meta.url)),
  '@runtime-shared': fileURLToPath(new URL('./runtime-shared', import.meta.url)),
}

export default defineConfig({
  scope,
  runtime: { config: { ssr: { noExternal: true }, resolve: { alias: sharedAlias } } },
  client: {
    plugins: [
      UnoCSS({ presets: [presetFlowupWind4({ scope })] }),
      solid({
        include: [
          '**/nodes/mqtt-subscribe/client/**/*.{jsx,tsx}',
          '**/components/**/*.{jsx,tsx}',
        ],
      }),
    ],
    config: { resolve: { alias: sharedAlias } },
  },
})
