import { createSolidHydrateStore } from '@wry-smile/flowup/client/solid'
import type { MqttSubscriberMqttSubscribeProperties } from '../../types'

export const DEFAULT_MQTT_IN_HYDRATE_STATE: MqttSubscriberMqttSubscribeProperties = {
  name: undefined,
  productId: '',
  organizationId: '',
  deviceId: '',
  deviceType: '',
}

export const mqttInStore = createSolidHydrateStore(DEFAULT_MQTT_IN_HYDRATE_STATE)
