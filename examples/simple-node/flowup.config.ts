import { defineConfig, presetFlowupWind4 } from '@wry-smile/flowup'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

const scope = 'simple-node'

export default defineConfig({
  scope,
  client: {
    plugins: [vue(), UnoCSS({ presets: [presetFlowupWind4({ scope })] })],
  },
})
