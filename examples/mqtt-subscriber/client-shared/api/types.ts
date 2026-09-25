import type { FetchRequestConfig } from '../fetch'

export interface ApiListEnvelope<T> {
  data?: ApiListResponse<T>
  result?: ApiListResponse<T>
  items?: T[]
  list?: T[]
  records?: T[]
  rows?: T[]
}

export type ApiListResponse<T> = T[] | ApiListEnvelope<T>

export type ApiRequestConfig = FetchRequestConfig

export interface DeviceProfile {
  id: string
  name: string
}

export interface Organization {
  id: string
  name: string
  children?: Organization[]
}

export interface Device {
  id: string
  name: string
  alias?: string
  deviceType?: string
}

export interface DeviceQuery {
  organizationId: string
  deviceProfileId: string
}

export interface DeviceCredentials {
  username?: string
  password?: string
  credentialsId?: string
  credentialsType?: string
  token?: string
  accessToken?: string
  credentialsValue?: string
  data?: DeviceCredentials
  result?: DeviceCredentials
}
