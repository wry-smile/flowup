import type { NodeAPI, NodeDef } from 'node-red'
import { MQTT_EVENT_NODE_NAME } from '../../constant'
import { acquireBroker } from '../shared/broker'
import {
  MqttConfigurationError,
  type FlowupNodeRedSettings,
  type MqttConfigurationErrorCode,
} from '../shared/config'
import { getMqttEventReportTopicByEntityIdWithIdentifier, readBrokerConfig } from '../shared/topics'

interface RuntimeTranslator {
  _(key: string): string
}

type MqttEventConfigurationErrorCode =
  | 'MISSING_ENTITY_ID'
  | 'MISSING_IDENTIFIER'
  | 'INVALID_IDENTIFIER'

class MqttEventConfigurationError extends Error {
  constructor(readonly code: MqttEventConfigurationErrorCode) {
    super(code)
    this.name = 'MqttEventConfigurationError'
  }
}

export default function mqttEventNodeInit(RED: NodeAPI): void {
  function MqttSubscriberMqttEventNodeConstructor(
    this: MqttSubscriberMqttEventNode,
    config: MqttSubscriberMqttEventNodeDef,
  ): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    const entityId = config.deviceId?.trim() ?? ''
    const identifier = config.identifier?.trim() ?? ''
    const settings = RED.settings as unknown as FlowupNodeRedSettings
    const qos = 1
    let lease: ReturnType<typeof acquireBroker> | undefined
    let lastConnectionError = ''

    try {
      if (!entityId) throw new MqttEventConfigurationError('MISSING_ENTITY_ID')
      if (!identifier) throw new MqttEventConfigurationError('MISSING_IDENTIFIER')
      if (identifier.includes('/') || identifier.includes('+') || identifier.includes('#'))
        throw new MqttEventConfigurationError('INVALID_IDENTIFIER')

      const topic = getMqttEventReportTopicByEntityIdWithIdentifier(entityId, identifier)
      lease = acquireBroker(readBrokerConfig(settings, node.credentials), (state, error) => {
        if (state === 'connected') {
          lastConnectionError = ''
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `${MQTT_EVENT_NODE_NAME}.status.connected`,
          })
        } else if (state === 'connecting') {
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `${MQTT_EVENT_NODE_NAME}.status.connecting`,
          })
        } else if (state === 'offline') {
          node.status({
            fill: 'grey',
            shape: 'ring',
            text: `${MQTT_EVENT_NODE_NAME}.status.offline`,
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

      node.on('input', (msg, _send, done) => {
        if (!lease) {
          done(new Error(translate(RED, 'errors.notConnected')))
          return
        }
        lease
          .publish(topic, msg.payload, qos)
          .then(() => done())
          .catch(error => {
            const failure = localizeError(RED, 'errors.publish', getErrorCode(error), error)
            node.error(failure, msg)
            done(failure)
          })
      })
    } catch (error) {
      const eventErrorCode = getMqttEventConfigurationErrorCode(error)
      const configErrorCode = getConfigurationErrorCode(error)
      const errorKey = eventErrorCode
        ? eventConfigurationErrorKey(eventErrorCode)
        : configErrorCode
          ? configurationErrorKey(configErrorCode)
          : 'errors.configuration'
      const statusKey =
        configErrorCode === 'MISSING_USERNAME'
          ? 'status.missingUsername'
          : 'status.configurationError'
      node.status({ fill: 'red', shape: 'ring', text: translate(RED, statusKey) })
      node.error(localizeError(RED, errorKey, '', error))
    }

    node.on('close', (removedOrDone: boolean | (() => void), maybeDone?: () => void) => {
      const done = typeof removedOrDone === 'function' ? removedOrDone : maybeDone
      lease?.release()
      node.status({})
      done?.()
    })
  }

  RED.nodes.registerType<MqttSubscriberMqttEventNode, MqttSubscriberMqttEventNodeDef, {}, {}>(
    MQTT_EVENT_NODE_NAME,
    MqttSubscriberMqttEventNodeConstructor,
  )
}

function translate(RED: NodeAPI, key: string): string {
  const translator = (RED as NodeAPI & RuntimeTranslator)._
  return translator
    ? translator(`${MQTT_EVENT_NODE_NAME}.${key}`)
    : `${MQTT_EVENT_NODE_NAME}.${key}`
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

function getMqttEventConfigurationErrorCode(
  error: unknown,
): MqttEventConfigurationErrorCode | undefined {
  return error instanceof MqttEventConfigurationError ? error.code : undefined
}

function eventConfigurationErrorKey(code: MqttEventConfigurationErrorCode): string {
  switch (code) {
    case 'MISSING_ENTITY_ID':
      return 'errors.missingEntityId'
    case 'MISSING_IDENTIFIER':
      return 'errors.missingIdentifier'
    case 'INVALID_IDENTIFIER':
      return 'errors.invalidIdentifier'
  }
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
