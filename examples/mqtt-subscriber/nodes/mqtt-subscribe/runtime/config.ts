import type { IClientOptions } from 'mqtt'

export interface BrokerConfig {
  url: string
  options: IClientOptions
}

export interface FlowupMqttSettings {
  url?: string
  host?: string
  port?: number
  secure?: boolean
  reconnectPeriod?: number
  connectTimeout?: number
}

/** Shape of the user settings object from Node-RED's settings.js. */
export interface FlowupNodeRedSettings {
  flowup?: {
    mqtt?: FlowupMqttSettings
  }
}

export interface MqttNodeCredentials {
  username?: string
  password?: string
}

export type MqttConfigurationErrorCode =
  | 'MISSING_BROKER_ADDRESS'
  | 'INVALID_BROKER_URL'
  | 'INVALID_PORT'
  | 'INVALID_SECURE'
  | 'MISSING_USERNAME'

export class MqttConfigurationError extends Error {
  constructor(
    readonly code: MqttConfigurationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'MqttConfigurationError'
  }
}

/** Environment variables supported by the MQTT runtime configuration. */
export interface FlowupMqttEnvironment {
  FLOWUP_MQTT_URL?: string
  FLOWUP_MQTT_HOST?: string
  FLOWUP_MQTT_PORT?: string
  FLOWUP_MQTT_SECURE?: string
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends FlowupMqttEnvironment {}
  }
}
