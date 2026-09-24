import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from '../constant'
import type { FrameworkGalleryVanillaNodeProperties } from '../types'
import { DEFAULT_HYDRATE_STATE, createVanillaHydrateStore } from './hydrate'
import { mountConfigPanel } from './components/mount-config-panel'
import 'virtual:uno.css'

const store = createVanillaHydrateStore()
let dispose: (() => void) | undefined

RED.nodes.registerType<FrameworkGalleryVanillaNodeClientNodeProperties>(NODE_NAME, {
  category: 'function',
  color: '#a6bbcf',
  icon: 'vanilla-node-icon.svg',
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
    dispose?.()
    dispose = undefined
    store.hydrate(this)
    const root = document.querySelector<HTMLElement>(
      '#dialog-form [data-flowup-scope="' + NODE_SCOPE + '"].flowup-vanilla-root',
    )
    if (root) {
      const state = store.getSnapshot()
      const patch = (key: keyof FrameworkGalleryVanillaNodeProperties, value: unknown) =>
        store.patch(key, value as never)
      dispose = mountConfigPanel(root, state, patch)
    }
  },
  oneditsave() {
    store.commit(this)
    dispose?.()
    dispose = undefined
  },
  oneditcancel() {
    dispose?.()
    dispose = undefined
  },
})
