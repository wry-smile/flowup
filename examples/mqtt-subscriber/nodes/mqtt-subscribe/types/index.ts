import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface MqttSubscriberMqttSubscribeProperties {
  name?: string
  productId: string
  organizationId: string
  deviceId: string
}

export type MqttSubscriberMqttSubscribeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof MqttSubscriberMqttSubscribeProperties
> &
  MqttSubscriberMqttSubscribeProperties

declare global {
  interface MqttSubscriberMqttSubscribeProperties {
    name?: string
    productId: string
    organizationId: string
    deviceId: string
  }

  type MqttSubscriberMqttSubscribeNodeDef = NodeDef & MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttSubscribeNode = Node & MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttSubscribeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof MqttSubscriberMqttSubscribeProperties
  > &
    MqttSubscriberMqttSubscribeProperties
}

export {}
