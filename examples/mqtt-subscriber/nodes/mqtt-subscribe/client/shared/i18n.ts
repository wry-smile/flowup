import { createClientI18n } from '@wry-smile/flowup/client'
import { MQTT_EVENT_NODE_NAME, MQTT_IN_NODE_NAME, MQTT_OUT_NODE_NAME } from '../../constant'

const moduleNamespace = 'flowup-mqtt-subscriber/mqtt-subscriber-nodes'

export const $mqttInT = createClientI18n(RED, moduleNamespace, MQTT_IN_NODE_NAME)
export const $mqttOutT = createClientI18n(RED, moduleNamespace, MQTT_OUT_NODE_NAME)
export const $mqttEventT = createClientI18n(RED, moduleNamespace, MQTT_EVENT_NODE_NAME)
