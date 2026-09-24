import type { FrameworkGallerySolidNodeClientNodeProperties } from '../types'
import type { EditorRED } from 'node-red'
import { render } from 'solid-js/web'
import 'virtual:uno.css'
import App from './App'
import { store } from './hydrate'
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
  icon: 'solid-node-solid.svg',
  defaults: { name: { value: '' } },
  inputs: 1,
  outputs: 1,
  paletteLabel: NODE_PALETTE_LABEL,
  label() {
    return this.name || NODE_NAME
  },
  oneditprepare() {
    store.hydrate(this)
    destroyApp()
    const target = document.querySelector(`[data-flowup-scope="${NODE_SCOPE}"].flowup-solid-root`)
    if (target) dispose = render(() => App(), target)
  },
  oneditsave() {
    store.commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
})
