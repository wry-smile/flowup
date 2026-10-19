import type { IClientOptions } from 'mqtt'
import { MqttConfigurationError } from './config'
import type {
  BrokerConfig,
  FlowupNodeRedSettings,
  FlowupMqttSettings,
  MqttNodeCredentials,
} from './config'

export const DeviceType = {
  Gateway: 'Gateway',
  Direct: 'Direct',
  Sensor: 'Sensor',
} as const

export function getMqttOutTopicByDeviceType(deviceType?: string): string {
  switch (normalizeDeviceType(deviceType)) {
    case DeviceType.Gateway.toLowerCase():
    case DeviceType.Direct.toLowerCase():
      return 'v1/devices/me/telemetry'
    case DeviceType.Sensor.toLowerCase():
      return 'v1/gateway/telemetry'
    default:
      return 'v1/devices/me/telemetry'
  }
}

export function getMqttInTopicByDeviceType(deviceType?: string): string {
  switch (normalizeDeviceType(deviceType)) {
    case DeviceType.Gateway.toLowerCase():
    case DeviceType.Direct.toLowerCase():
      return 'v1/devices/me/rpc/request/+'
    case DeviceType.Sensor.toLowerCase():
      return 'v1/gateway/rpc'
    default:
      return 'v1/devices/me/rpc/request/+'
  }
}

export function getMqttEventReportTopicByEntityIdWithIdentifier(
  entityId: string,
  identifier: string,
): string {
  return `v1/devices/event/${entityId}/${identifier}`
}

function normalizeDeviceType(deviceType?: string): string | undefined {
  return deviceType?.trim().toLowerCase()
}

/** Resolves Node-RED settings and environment variables into MQTT connection options. */
export function readBrokerConfig(
  settings: FlowupNodeRedSettings,
  credentials: MqttNodeCredentials = {},
): BrokerConfig {
  const configured: FlowupMqttSettings = settings.flowup?.mqtt ?? {}
  const env = process.env
  const configuredUrl = env.FLOWUP_MQTT_URL ?? stringValue(configured.url)
  const configuredHost = env.FLOWUP_MQTT_HOST ?? stringValue(configured.host)
  const configuredPort = portValue(env.FLOWUP_MQTT_PORT) ?? portValue(configured.port)
  const requestedPort = env.FLOWUP_MQTT_PORT ?? configured.port
  if (requestedPort !== undefined && configuredPort === undefined) {
    throw new MqttConfigurationError(
      'INVALID_PORT',
      `Invalid MQTT port "${requestedPort}". Use an integer from 1 to 65535.`,
    )
  }
  const envSecure = parseBoolean(env.FLOWUP_MQTT_SECURE)
  if (env.FLOWUP_MQTT_SECURE !== undefined && envSecure === undefined) {
    throw new MqttConfigurationError(
      'INVALID_SECURE',
      'Invalid FLOWUP_MQTT_SECURE value. Use "true" or "false".',
    )
  }
  const secureOverride = envSecure ?? configured.secure
  const url = configuredUrl
    ? parseBrokerUrlSafely(configuredUrl, configuredPort, secureOverride)
    : buildUrl(configuredHost, configuredPort, secureOverride)
  if (!url) {
    throw new MqttConfigurationError(
      'MISSING_BROKER_ADDRESS',
      'Configure flowup.mqtt.url/host or FLOWUP_MQTT_URL/HOST for the MQTT broker.',
    )
  }
  if (!credentials.username?.trim()) {
    throw new MqttConfigurationError(
      'MISSING_USERNAME',
      'The selected device MQTT username credential is missing. Re-select the device to reload credentials.',
    )
  }

  const options: IClientOptions = {
    ...(credentials.username ? { username: credentials.username } : {}),
    ...(credentials.password ? { password: credentials.password } : {}),
    reconnectPeriod: numberValue(configured.reconnectPeriod) ?? 1_000,
    connectTimeout: numberValue(configured.connectTimeout) ?? 30_000,
    clean: true,
  }

  return { url, options }
}

function parseBrokerUrlSafely(
  value: string,
  fallbackPort?: number,
  secureOverride?: boolean,
): string {
  try {
    return parseBrokerUrl(value, fallbackPort, secureOverride)
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new MqttConfigurationError(
      'INVALID_BROKER_URL',
      `Invalid MQTT broker URL "${value}": ${reason}`,
      { cause },
    )
  }
}

function parseBrokerUrl(value: string, fallbackPort?: number, secureOverride?: boolean): string {
  const normalizedInput = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `mqtt://${value}`
  const parsed = new URL(normalizedInput)
  if (!['http:', 'https:', 'mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported MQTT broker URL protocol: ${parsed.protocol}`)
  }
  const protocolSecure = ['https:', 'mqtts:', 'wss:'].includes(parsed.protocol)
  const secure = secureOverride ?? protocolSecure
  const explicitPort = parsed.port ? Number(parsed.port) : undefined
  parsed.protocol = secure ? 'mqtts:' : 'mqtt:'
  parsed.port = String(explicitPort ?? fallbackPort ?? (secure ? 8883 : 1883))
  parsed.pathname = ''
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}

function buildUrl(
  host: string | undefined,
  port: number | undefined,
  secure?: boolean,
): string | undefined {
  if (!host) return undefined
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(host)) return parseBrokerUrlSafely(host, port, secure)
  const isSecure = secure ?? false
  const normalizedHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
  return parseBrokerUrlSafely(`${isSecure ? 'mqtts' : 'mqtt'}://${normalizedHost}`, port, isSecure)
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  if (value.toLowerCase() === 'true' || value === '1') return true
  if (value.toLowerCase() === 'false' || value === '0') return false
  return undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function portValue(value: unknown): number | undefined {
  const port = Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : undefined
}
