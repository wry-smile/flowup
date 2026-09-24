import { createApp, type App as VueApp } from 'vue'
import 'virtual:uno.css'
import App from './App.vue'
import { DEFAULT_HYDRATE_STATE, useHydrateStore } from './hydrate'
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from '../constant'

let app: VueApp | undefined
function destroyApp() {
  app?.unmount()
  app = undefined
}

RED.nodes.registerType<SimpleNodeClientNodeProperties>(NODE_NAME, {
  category: 'function',
  color: '#a6bbcf',
  icon: 'icon.svg',
  defaults: {
    name: { value: DEFAULT_HYDRATE_STATE.name },
    framework: { value: DEFAULT_HYDRATE_STATE.framework },
    mode: { value: DEFAULT_HYDRATE_STATE.mode },
    enabled: { value: DEFAULT_HYDRATE_STATE.enabled },
    price: { value: DEFAULT_HYDRATE_STATE.price },
    quantity: { value: DEFAULT_HYDRATE_STATE.quantity },
    items: { value: DEFAULT_HYDRATE_STATE.items },
  },
  inputs: 1,
  outputs: 1,
  paletteLabel: NODE_PALETTE_LABEL,
  label() {
    return this.name || NODE_NAME
  },
  oneditprepare() {
    destroyApp()
    useHydrateStore().hydrate(this)
    const target = document.querySelector(
      '[data-flowup-scope="' + NODE_SCOPE + '"].flowup-vue-root',
    )
    if (target) {
      app = createApp(App)
      app.mount(target)
    }
  },
  oneditsave() {
    useHydrateStore().commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
})
