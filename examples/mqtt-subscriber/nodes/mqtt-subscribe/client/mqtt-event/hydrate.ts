import { createSolidHydrateStore } from '@wry-smile/flowup/client/solid'
import type { MqttSubscriberMqttEventProperties } from '../../types'

export const DEFAULT_MQTT_EVENT_HYDRATE_STATE: MqttSubscriberMqttEventProperties = {
  name: undefined,
  productId: '',
  organizationId: '',
  deviceId: '',
  deviceType: '',
  identifier: '',
}

export const mqttEventStore = createSolidHydrateStore(DEFAULT_MQTT_EVENT_HYDRATE_STATE)
