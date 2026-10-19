import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface MqttSubscriberMqttSubscribeProperties {
  name?: string
  productId: string
  organizationId: string
  deviceId: string
  deviceType?: string
}

export interface MqttSubscriberMqttOutMapping {
  attribute: string
  payloadKey: string
}

export interface MqttSubscriberMqttOutProperties extends MqttSubscriberMqttSubscribeProperties {
  mappings: MqttSubscriberMqttOutMapping[]
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

export type MqttSubscriberMqttOutClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof MqttSubscriberMqttOutProperties
> &
  MqttSubscriberMqttOutProperties
export type MqttSubscriberMqttInClientNodeProperties =
  MqttSubscriberMqttSubscribeClientNodeProperties
export interface MqttSubscriberMqttEventProperties extends MqttSubscriberMqttSubscribeProperties {
  identifier: string
}
export type MqttSubscriberMqttEventClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof MqttSubscriberMqttEventProperties
> &
  MqttSubscriberMqttEventProperties

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

  type MqttSubscriberMqttInNodeDef = NodeDef & MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttInNode = Node<MqttSubscriberMqttSubscribeCredentials> &
    MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttOutNodeDef = NodeDef & MqttSubscriberMqttOutProperties

  type MqttSubscriberMqttOutNode = Node<MqttSubscriberMqttSubscribeCredentials> &
    MqttSubscriberMqttOutProperties

  type MqttSubscriberMqttEventNodeDef = NodeDef & MqttSubscriberMqttEventProperties

  type MqttSubscriberMqttEventNode = Node<MqttSubscriberMqttSubscribeCredentials> &
    MqttSubscriberMqttEventProperties

  type MqttSubscriberMqttSubscribeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof MqttSubscriberMqttSubscribeProperties
  > &
    MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttInClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof MqttSubscriberMqttSubscribeProperties
  > &
    MqttSubscriberMqttSubscribeProperties

  type MqttSubscriberMqttOutClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof MqttSubscriberMqttOutProperties
  > &
    MqttSubscriberMqttOutProperties

  type MqttSubscriberMqttEventClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof MqttSubscriberMqttEventProperties
  > &
    MqttSubscriberMqttEventProperties
}

export {}
