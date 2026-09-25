import { createClientI18n } from '@wry-smile/flowup/client'
import { createSolidHydrateStore } from '@wry-smile/flowup/client/solid'
import { NODE_NAME } from '../constant'
import type { MqttSubscriberMqttSubscribeProperties } from '../types'

export const $t = createClientI18n(RED, 'flowup-mqtt-subscriber/mqtt-subscriber-nodes', NODE_NAME)

export const DEFAULT_HYDRATE_STATE: MqttSubscriberMqttSubscribeProperties = {
  name: undefined,
  productId: '',
  organizationId: '',
  deviceId: '',
}
export const store = createSolidHydrateStore(DEFAULT_HYDRATE_STATE)
