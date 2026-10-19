import type { MqttSubscriberMqttOutClientNodeProperties } from '../../types'
import { render } from 'solid-js/web'
import App from './App'
import { $mqttOutT } from '../shared/i18n'
import { mqttOutStore, DEFAULT_MQTT_OUT_HYDRATE_STATE } from './hydrate'
import { MQTT_OUT_NODE_NAME, MQTT_OUT_PALETTE_LABEL, NODE_SCOPE } from '../../constant'

let dispose: (() => void) | undefined

function destroyApp() {
  dispose?.()
  dispose = undefined
}

export const mqttOutNodeDefinition = {
  category: 'output',
  color: '#80cbc4',
  icon: 'mqtt-subscribe-icon.svg',
  defaults: {
    name: { value: DEFAULT_MQTT_OUT_HYDRATE_STATE.name },
    productId: {
      value: DEFAULT_MQTT_OUT_HYDRATE_STATE.productId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    organizationId: {
      value: DEFAULT_MQTT_OUT_HYDRATE_STATE.organizationId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    deviceId: {
      value: DEFAULT_MQTT_OUT_HYDRATE_STATE.deviceId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    deviceType: { value: DEFAULT_MQTT_OUT_HYDRATE_STATE.deviceType },
    mappings: { value: DEFAULT_MQTT_OUT_HYDRATE_STATE.mappings },
  },
  credentials: {
    username: { type: 'text' },
    password: { type: 'password' },
  },
  inputs: 1,
  outputs: 0,
  paletteLabel: MQTT_OUT_PALETTE_LABEL,
  label(this: MqttSubscriberMqttOutClientNodeProperties) {
    return this.name || MQTT_OUT_NODE_NAME
  },
  oneditprepare(this: MqttSubscriberMqttOutClientNodeProperties) {
    destroyApp()
    mqttOutStore.hydrate(this)
    const target = document.querySelector(
      '#dialog-form [data-flowup-scope="' + NODE_SCOPE + '"].flowup-solid-root',
    )
    if (target)
      dispose = render(() => <App store={mqttOutStore} t={$mqttOutT} idPrefix="mqtt-out" />, target)
  },
  oneditsave(this: MqttSubscriberMqttOutClientNodeProperties) {
    mqttOutStore.commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
}
