import { createSolidHydrateStore } from '@wry-smile/flowup/client/solid'
import type { MqttSubscriberMqttOutProperties } from '../../types'

export const DEFAULT_MQTT_OUT_HYDRATE_STATE: MqttSubscriberMqttOutProperties = {
  name: undefined,
  productId: '',
  organizationId: '',
  deviceId: '',
  deviceType: '',
  mappings: [],
}

export const mqttOutStore = createSolidHydrateStore(DEFAULT_MQTT_OUT_HYDRATE_STATE)
