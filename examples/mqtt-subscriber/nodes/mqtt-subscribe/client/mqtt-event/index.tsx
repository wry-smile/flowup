import type { MqttSubscriberMqttEventClientNodeProperties } from '../../types'
import { render } from 'solid-js/web'
import App from './App'
import { $mqttEventT } from '../shared/i18n'
import { DEFAULT_MQTT_EVENT_HYDRATE_STATE, mqttEventStore } from './hydrate'
import { MQTT_EVENT_NODE_NAME, MQTT_EVENT_PALETTE_LABEL, NODE_SCOPE } from '../../constant'

let dispose: (() => void) | undefined

function destroyApp() {
  dispose?.()
  dispose = undefined
}

export const mqttEventNodeDefinition = {
  category: 'output',
  color: '#80cbc4',
  icon: 'mqtt-subscribe-icon.svg',
  defaults: {
    name: { value: DEFAULT_MQTT_EVENT_HYDRATE_STATE.name },
    productId: {
      value: DEFAULT_MQTT_EVENT_HYDRATE_STATE.productId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    organizationId: {
      value: DEFAULT_MQTT_EVENT_HYDRATE_STATE.organizationId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    deviceId: {
      value: DEFAULT_MQTT_EVENT_HYDRATE_STATE.deviceId,
      required: true,
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
    },
    deviceType: { value: DEFAULT_MQTT_EVENT_HYDRATE_STATE.deviceType },
    identifier: {
      value: DEFAULT_MQTT_EVENT_HYDRATE_STATE.identifier,
      required: true,
      validate: (value: string) =>
        typeof value === 'string' &&
        value.trim().length > 0 &&
        !value.includes('/') &&
        !value.includes('+') &&
        !value.includes('#'),
    },
  },
  credentials: {
    username: { type: 'text' },
    password: { type: 'password' },
  },
  inputs: 1,
  outputs: 0,
  paletteLabel: MQTT_EVENT_PALETTE_LABEL,
  label(this: MqttSubscriberMqttEventClientNodeProperties) {
    return this.name || MQTT_EVENT_NODE_NAME
  },
  oneditprepare(this: MqttSubscriberMqttEventClientNodeProperties) {
    destroyApp()
    mqttEventStore.hydrate(this)
    const target = document.querySelector(
      '#dialog-form [data-flowup-scope="' + NODE_SCOPE + '"].flowup-solid-root',
    )
    if (target)
      dispose = render(
        () => (
          <App store={mqttEventStore} t={$mqttEventT} idPrefix="mqtt-event" />
        ),
        target,
      )
  },
  oneditsave(this: MqttSubscriberMqttEventClientNodeProperties) {
    mqttEventStore.commit(this)
    destroyApp()
  },
  oneditcancel() {
    destroyApp()
  },
}
