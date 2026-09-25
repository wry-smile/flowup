import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface MqttSubscriberMqttSubscribeProperties {
  name?: string
  productId: string
  organizationId: string
  deviceId: string
  deviceType?: string
}

export interface MqttSubscriberMqttSubscribeCredentials {
  username?: string
  password?: string
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
    deviceType?: string
  }

  type MqttSubscriberMqttSubscribeNodeDef = NodeDef & MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttSubscribeNode = Node<MqttSubscriberMqttSubscribeCredentials> &
    MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttSubscribeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof MqttSubscriberMqttSubscribeProperties
  > &
    MqttSubscriberMqttSubscribeProperties
}

export {}
