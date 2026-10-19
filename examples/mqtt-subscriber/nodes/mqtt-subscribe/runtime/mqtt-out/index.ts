import type { NodeAPI, NodeDef } from 'node-red'
import type { MqttSubscriberMqttOutMapping } from '../../types'
import { MQTT_OUT_NODE_NAME } from '../../constant'
import { acquireBroker } from '../shared/broker'
import {
  MqttConfigurationError,
  type FlowupNodeRedSettings,
  type MqttConfigurationErrorCode,
} from '../shared/config'
import { getMqttOutTopicByDeviceType, readBrokerConfig } from '../shared/topics'

interface RuntimeTranslator {
  _(key: string): string
}

export default function mqttOutNodeInit(RED: NodeAPI): void {
  function MqttSubscriberMqttOutNodeConstructor(
    this: MqttSubscriberMqttOutNode,
    config: MqttSubscriberMqttOutNodeDef,
  ): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    node.credentials = { username: '9xK9KktRLLwYhLHjDU7A' }
    const settings = RED.settings as unknown as FlowupNodeRedSettings
    const outputTopic = getMqttOutTopicByDeviceType(config.deviceType)
    const qos = 1
    let lease: ReturnType<typeof acquireBroker> | undefined
    let lastConnectionError = ''

    try {
      lease = acquireBroker(readBrokerConfig(settings, node.credentials), (state, error) => {
        if (state === 'connected') {
          lastConnectionError = ''
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `${MQTT_OUT_NODE_NAME}.status.connected`,
          })
        } else if (state === 'connecting') {
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `${MQTT_OUT_NODE_NAME}.status.connecting`,
          })
        } else if (state === 'offline') {
          node.status({
            fill: 'grey',
            shape: 'ring',
            text: `${MQTT_OUT_NODE_NAME}.status.offline`,
          })
        } else {
          const code = getErrorCode(error)
          const authenticationRejected = isAuthenticationError(error)
          const statusKey = authenticationRejected
            ? 'status.authenticationRejected'
            : 'status.connectionError'
          node.status({
            fill: 'red',
            shape: 'ring',
            text: code ? `${translate(RED, statusKey)} (${code})` : translate(RED, statusKey),
          })
          const errorIdentity = code || getErrorMessage(error)
          if (error && errorIdentity !== lastConnectionError) {
            lastConnectionError = errorIdentity
            node.error(
              localizeError(
                RED,
                authenticationRejected ? 'errors.authenticationRejected' : 'errors.connection',
                code,
                error,
              ),
            )
          }
        }
      })
    } catch (error) {
      const configErrorCode = getConfigurationErrorCode(error)
      const statusKey =
        configErrorCode === 'MISSING_USERNAME'
          ? 'status.missingUsername'
          : 'status.configurationError'
      const errorKey = configErrorCode
        ? configurationErrorKey(configErrorCode)
        : 'errors.configuration'
      const detail = configErrorCode ? '' : getErrorCode(error)
      node.status({
        fill: 'red',
        shape: 'ring',
        text: detail ? `${translate(RED, statusKey)} (${detail})` : translate(RED, statusKey),
      })
      node.error(localizeError(RED, errorKey, detail, error))
    }

    node.on('input', (msg, _send, done) => {
      if (!lease) {
        done(new Error(translate(RED, 'errors.notConnected')))
        return
      }
      lease
        .publish(outputTopic, applyAttributeMappings(msg.payload, config.mappings), qos)
        .then(() => done())
        .catch(error => {
          const failure = localizeError(RED, 'errors.publish', getErrorCode(error), error)
          node.error(failure, msg)
          done(failure)
        })
    })

    node.on('close', (removedOrDone: boolean | (() => void), maybeDone?: () => void) => {
      const done = typeof removedOrDone === 'function' ? removedOrDone : maybeDone
      lease?.release()
      node.status({})
      done?.()
    })
  }

  RED.nodes.registerType<MqttSubscriberMqttOutNode, MqttSubscriberMqttOutNodeDef, {}, {}>(
    MQTT_OUT_NODE_NAME,
    MqttSubscriberMqttOutNodeConstructor,
  )
}

function applyAttributeMappings(
  payload: unknown,
  mappings: MqttSubscriberMqttOutMapping[] | undefined,
): unknown {
  if (!mappings?.length) return payload

  let value = payload
  if (Buffer.isBuffer(value)) value = value.toString()
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const source = value as Record<string, unknown>
  const mapped: Record<string, unknown> = {}
  for (const mapping of mappings) {
    const attribute = mapping.attribute?.trim()
    const payloadKey = mapping.payloadKey?.trim()
    if (!attribute || !payloadKey || !Object.hasOwn(source, payloadKey)) continue
    mapped[attribute] = source[payloadKey]
  }
  return mapped
}

function translate(RED: NodeAPI, key: string): string {
  const translator = (RED as NodeAPI & RuntimeTranslator)._
  return translator ? translator(`${MQTT_OUT_NODE_NAME}.${key}`) : `${MQTT_OUT_NODE_NAME}.${key}`
}

function localizeError(RED: NodeAPI, key: string, detail: string, cause: unknown): Error {
  const title = translate(RED, key)
  return new Error(detail ? `${title}: ${detail}` : title, { cause })
}

function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return ''
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /not authorized|unauthori[sz]ed|bad user(name)? or password|authentication failed/i.test(
    error.message,
  )
}

function getConfigurationErrorCode(error: unknown): MqttConfigurationErrorCode | undefined {
  return error instanceof MqttConfigurationError ? error.code : undefined
}

function configurationErrorKey(code: MqttConfigurationErrorCode): string {
  switch (code) {
    case 'MISSING_BROKER_ADDRESS':
      return 'errors.missingBrokerAddress'
    case 'INVALID_BROKER_URL':
      return 'errors.invalidBrokerUrl'
    case 'INVALID_PORT':
      return 'errors.invalidPort'
    case 'INVALID_SECURE':
      return 'errors.invalidSecure'
    case 'MISSING_USERNAME':
      return 'errors.missingUsername'
  }
}
