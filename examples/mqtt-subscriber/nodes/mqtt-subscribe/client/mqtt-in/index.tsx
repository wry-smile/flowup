import type { MqttSubscriberMqttInClientNodeProperties } from '../../types'
import { render } from 'solid-js/web'
import App from './App'
import { $mqttInT } from '../shared/i18n'
import { mqttInStore } from './hydrate'
import { DEFAULT_MQTT_IN_HYDRATE_STATE } from './hydrate'
import { MQTT_IN_NODE_NAME, MQTT_IN_PALETTE_LABEL, NODE_SCOPE } from '../../constant'

let dispose: (() => void) | undefined

function destroyApp() {
  dispose?.()
  dispose = undefined
}

export const mqttInNodeDefinition = {
  category: 'input',
  color: '#80cbc4',
  icon: 'mqtt-subscribe-icon.svg',
  defaults: {
    name: { value: DEFAULT_MQTT_IN_HYDRATE_STATE.name },
    productId: {
      value: DEFAULT_MQTT_IN_HYDRATE_STATE.productId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    organizationId: {
      value: DEFAULT_MQTT_IN_HYDRATE_STATE.organizationId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    deviceId: {
      value: DEFAULT_MQTT_IN_HYDRATE_STATE.deviceId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    deviceType: { value: DEFAULT_MQTT_IN_HYDRATE_STATE.deviceType },
  },
  credentials: {
    username: { type: 'text' },
    password: { type: 'password' },
  },
  inputs: 0,
  outputs: 1,
  paletteLabel: MQTT_IN_PALETTE_LABEL,
  label(this: MqttSubscriberMqttInClientNodeProperties) {
    return this.name || MQTT_IN_NODE_NAME
  },
  oneditprepare(this: MqttSubscriberMqttInClientNodeProperties) {
    destroyApp()
    mqttInStore.hydrate(this)
    const target = document.querySelector(
      '#dialog-form [data-flowup-scope="' + NODE_SCOPE + '"].flowup-solid-root',
    )
    if (target)
      dispose = render(() => <App store={mqttInStore} t={$mqttInT} idPrefix="mqtt-in" />, target)
  },
  oneditsave(this: MqttSubscriberMqttInClientNodeProperties) {
    mqttInStore.commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
}
