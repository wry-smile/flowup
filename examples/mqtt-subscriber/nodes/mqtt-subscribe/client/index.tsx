import type { EditorRED } from 'node-red'
import type { MqttSubscriberMqttSubscribeClientNodeProperties } from '../types'
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

RED.nodes.registerType<MqttSubscriberMqttSubscribeClientNodeProperties>(NODE_NAME, {
  category: 'function',
  color: '#a6bbcf',
  icon: 'mqtt-subscribe-icon.svg',
  defaults: {
    name: { value: DEFAULT_HYDRATE_STATE.name },
    productId: {
      value: DEFAULT_HYDRATE_STATE.productId,
      required: true,
      validate: value => typeof value === 'string' && value.trim().length > 0,
    },
    organizationId: {
      value: DEFAULT_HYDRATE_STATE.organizationId,
      required: true,
      validate: value => typeof value === 'string' && value.trim().length > 0,
    },
    deviceId: {
      value: DEFAULT_HYDRATE_STATE.deviceId,
      required: true,
      validate: value => typeof value === 'string' && value.trim().length > 0,
    },
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
