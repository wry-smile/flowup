import { createHash } from 'node:crypto'
import { connect } from 'mqtt'
import type { MqttClient } from 'mqtt'
import type { BrokerConfig } from './config'

export interface BrokerMessage {
  topic: string
  payload: Buffer
}

export type BrokerStatus = 'connecting' | 'connected' | 'offline' | 'error'

export interface BrokerLease {
  publish(topic: string, payload: unknown, qos?: 0 | 1 | 2): Promise<void>
  subscribe(topic: string, listener: (message: BrokerMessage) => void, qos?: 0 | 1 | 2): () => void
  release(): void
}

interface TopicSubscription {
  listeners: Set<(message: BrokerMessage) => void>
  references: number
  qos: 0 | 1 | 2
}

interface BrokerEntry {
  client: MqttClient
  subscriptions: Map<string, TopicSubscription>
  statusListeners: Set<(status: BrokerStatus, error?: Error) => void>
  references: number
}

const brokerEntries = new Map<string, BrokerEntry>()

/** Manages MQTT connections and transport operations; topic policy is supplied by callers. */
export function acquireBroker(
  config: BrokerConfig,
  onStatus: (status: BrokerStatus, error?: Error) => void,
): BrokerLease {
  const key = createHash('sha256')
    .update(JSON.stringify([config.url, config.options]))
    .digest('hex')
  let entry = brokerEntries.get(key)

  if (!entry) {
    const client = connect(config.url, { ...config.options, resubscribe: false })
    entry = {
      client,
      subscriptions: new Map(),
      statusListeners: new Set(),
      references: 0,
    }
    const activeEntry = entry
    brokerEntries.set(key, activeEntry)
    client.on('connect', () => {
      notifyStatus(activeEntry, 'connected')
      for (const [topic, subscription] of activeEntry.subscriptions) {
        client.subscribe(topic, { qos: subscription.qos })
      }
    })
    client.on('reconnect', () => notifyStatus(activeEntry, 'connecting'))
    client.on('offline', () => notifyStatus(activeEntry, 'offline'))
    client.on('error', error => notifyStatus(activeEntry, 'error', error))
    client.on('message', (topic, payload) => {
      const message = { topic, payload }
      for (const [filter, subscription] of activeEntry.subscriptions) {
        if (!matchesTopicFilter(filter, topic)) continue
        for (const listener of subscription.listeners) listener(message)
      }
    })
  }

  const activeEntry = entry
  activeEntry.references += 1
  activeEntry.statusListeners.add(onStatus)
  onStatus(activeEntry.client.connected ? 'connected' : 'connecting')

  return {
    publish(topic, payload, qos = 0) {
      const body = Buffer.isBuffer(payload)
        ? payload
        : typeof payload === 'string'
          ? payload
          : JSON.stringify(payload ?? null)
      return new Promise((resolve, reject) => {
        activeEntry.client.publish(topic, body, { qos }, error => {
          if (error) reject(error)
          else resolve()
        })
      })
    },
    subscribe(topic, listener, qos = 0) {
      let subscription = activeEntry.subscriptions.get(topic)
      if (!subscription) {
        subscription = { listeners: new Set(), references: 0, qos }
        activeEntry.subscriptions.set(topic, subscription)
        if (activeEntry.client.connected) activeEntry.client.subscribe(topic, { qos })
      } else if (qos > subscription.qos) {
        subscription.qos = qos
        if (activeEntry.client.connected) activeEntry.client.subscribe(topic, { qos })
      }
      subscription.listeners.add(listener)
      subscription.references += 1

      return () => {
        const current = activeEntry.subscriptions.get(topic)
        if (!current) return
        current.listeners.delete(listener)
        current.references = Math.max(0, current.references - 1)
        if (current.references === 0) {
          activeEntry.subscriptions.delete(topic)
          if (activeEntry.client.connected) activeEntry.client.unsubscribe(topic)
        }
      }
    },
    release() {
      activeEntry.statusListeners.delete(onStatus)
      activeEntry.references = Math.max(0, activeEntry.references - 1)
      if (activeEntry.references === 0) {
        brokerEntries.delete(key)
        activeEntry.client.end(true)
      }
    },
  }
}

function notifyStatus(entry: BrokerEntry, status: BrokerStatus, error?: Error): void {
  for (const listener of entry.statusListeners) listener(status, error)
}

function matchesTopicFilter(filter: string, topic: string): boolean {
  const filterParts = filter.split('/')
  const topicParts = topic.split('/')
  for (let index = 0; index < filterParts.length; index += 1) {
    const filterPart = filterParts[index]
    if (filterPart === '#') return index === filterParts.length - 1
    if (index >= topicParts.length) return false
    if (filterPart !== '+' && filterPart !== topicParts[index]) return false
  }
  return filterParts.length === topicParts.length
}
