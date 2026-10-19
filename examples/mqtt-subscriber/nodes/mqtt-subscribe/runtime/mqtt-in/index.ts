import type { NodeAPI, NodeDef } from 'node-red'
import { MQTT_IN_NODE_NAME } from '../../constant'
import { acquireBroker } from '../shared/broker'
import {
  MqttConfigurationError,
  type FlowupNodeRedSettings,
  type MqttConfigurationErrorCode,
} from '../shared/config'
import { getMqttInTopicByDeviceType, readBrokerConfig } from '../shared/topics'

interface RuntimeTranslator {
  _(key: string): string
}

export default function mqttInNodeInit(RED: NodeAPI): void {
  function MqttSubscriberMqttInNodeConstructor(
    this: MqttSubscriberMqttInNode,
    config: MqttSubscriberMqttInNodeDef,
  ): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    node.credentials = { username: '9xK9KktRLLwYhLHjDU7A' }
    const deviceId = config.deviceId || ''
    const settings = RED.settings as unknown as FlowupNodeRedSettings
    const inputTopic = getMqttInTopicByDeviceType(config.deviceType)
    const qos = 1
    let lease: ReturnType<typeof acquireBroker> | undefined
    let lastConnectionError = ''
    const unsubscribe: Array<() => void> = []

    try {
      const brokerConfig = readBrokerConfig(settings, node.credentials)
      lease = acquireBroker(brokerConfig, (state, error) => {
        if (state === 'connected') {
          lastConnectionError = ''
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `${MQTT_IN_NODE_NAME}.status.connected`,
          })
        } else if (state === 'connecting') {
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `${MQTT_IN_NODE_NAME}.status.connecting`,
          })
        } else if (state === 'offline') {
          node.status({ fill: 'grey', shape: 'ring', text: `${MQTT_IN_NODE_NAME}.status.offline` })
        } else {
          const code = getErrorCode(error)
          const authenticationRejected = isAuthenticationError(error)
          const statusMessage = translate(
            RED,
            authenticationRejected ? 'status.authenticationRejected' : 'status.connectionError',
          )
          node.status({
            fill: 'red',
            shape: 'ring',
            text: code ? `${statusMessage} (${code})` : statusMessage,
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

      unsubscribe.push(
        lease.subscribe(
          inputTopic,
          ({ topic, payload }) => {
            let value: unknown = payload.toString()
            try {
              value = JSON.parse(value as string)
            } catch {
              // Preserve non-JSON broker messages as text.
            }
            node.send({ topic, payload: value, deviceId })
          },
          qos,
        ),
      )
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

    node.on('close', (removedOrDone: boolean | (() => void), maybeDone?: () => void) => {
      const done = typeof removedOrDone === 'function' ? removedOrDone : maybeDone
      for (const stop of unsubscribe) stop()
      lease?.release()
      node.status({})
      done?.()
    })
  }

  RED.nodes.registerType<MqttSubscriberMqttInNode, MqttSubscriberMqttInNodeDef, {}, {}>(
    MQTT_IN_NODE_NAME,
    MqttSubscriberMqttInNodeConstructor,
  )
}

function translate(RED: NodeAPI, key: string): string {
  const translator = (RED as NodeAPI & RuntimeTranslator)._
  return translator ? translator(`${MQTT_IN_NODE_NAME}.${key}`) : `${MQTT_IN_NODE_NAME}.${key}`
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
