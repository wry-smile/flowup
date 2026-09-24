import type { FrameworkGalleryPreactNodeClientNodeProperties } from '../types'
import type { EditorRED } from 'node-red'
import { render } from 'preact'
import 'virtual:uno.css'
import App from './App'
import { store } from './hydrate'
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from '../constant'

declare const RED: EditorRED

let target: HTMLElement | null = null
function destroyApp() {
  if (target) render(null, target)
  target = null
}

RED.nodes.registerType<FrameworkGalleryPreactNodeClientNodeProperties>(NODE_NAME, {
  category: 'function',
  color: '#a6bbcf',
  icon: 'preact-node-preact.svg',
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
    target = document.querySelector(`[data-flowup-scope="${NODE_SCOPE}"].flowup-preact-root`)
    if (target) render(<App />, target)
  },
  oneditsave() {
    store.commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
})
