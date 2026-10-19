import type { EditorRED } from 'node-red'
import type {
  MqttSubscriberMqttInClientNodeProperties,
  MqttSubscriberMqttEventClientNodeProperties,
  MqttSubscriberMqttOutClientNodeProperties,
} from '../types'
import { MQTT_EVENT_NODE_NAME, MQTT_IN_NODE_NAME, MQTT_OUT_NODE_NAME } from '../constant'
import { mqttInNodeDefinition } from './mqtt-in'
import { mqttOutNodeDefinition } from './mqtt-out'
import { mqttEventNodeDefinition } from './mqtt-event'
import 'virtual:uno.css'

declare const RED: EditorRED

RED.nodes.registerType<MqttSubscriberMqttInClientNodeProperties>(
  MQTT_IN_NODE_NAME,
  mqttInNodeDefinition as unknown as Parameters<
    typeof RED.nodes.registerType<MqttSubscriberMqttInClientNodeProperties>
  >[1],
)

RED.nodes.registerType<MqttSubscriberMqttOutClientNodeProperties>(
  MQTT_OUT_NODE_NAME,
  mqttOutNodeDefinition as unknown as Parameters<
    typeof RED.nodes.registerType<MqttSubscriberMqttOutClientNodeProperties>
  >[1],
)

RED.nodes.registerType<MqttSubscriberMqttEventClientNodeProperties>(
  MQTT_EVENT_NODE_NAME,
  mqttEventNodeDefinition as unknown as Parameters<
    typeof RED.nodes.registerType<MqttSubscriberMqttEventClientNodeProperties>
  >[1],
)
