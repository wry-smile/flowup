import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { presetFlowupWind4 } from '@wry-smile/flowup'

import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'simple-node',
  client: {
    plugins: [vue(), UnoCSS({ presets: [presetFlowupWind4({ scope: 'simple-node' })] })],
  },
})
