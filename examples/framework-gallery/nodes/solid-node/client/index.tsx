import type { EditorRED } from 'node-red'
import type { FrameworkGallerySolidNodeClientNodeProperties } from '../types'
import { render } from 'solid-js/web'
import 'virtual:uno.css'
import App from './App'
import { DEFAULT_HYDRATE_STATE, store } from './hydrate'
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from '../constant'

declare const RED: EditorRED
let dispose: (() => void) | undefined
function destroyApp() {
  dispose?.()
  dispose = undefined
}

RED.nodes.registerType<FrameworkGallerySolidNodeClientNodeProperties>(NODE_NAME, {
  category: 'function',
  color: '#a6bbcf',
  icon: 'solid-node-icon.svg',
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
    store.hydrate(this)
    const target = document.querySelector(
      '#dialog-form [data-flowup-scope="' + NODE_SCOPE + '"].flowup-solid-root',
    )
    if (target) dispose = render(() => <App />, target)
  },
  oneditsave() {
    store.commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
})
