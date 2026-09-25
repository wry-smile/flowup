import { createFetchClient } from '../fetch'
import type {
  ApiListResponse,
  ApiRequestConfig,
  Device,
  DeviceProfile,
  DeviceQuery,
  Organization,
} from './types'

const request = createFetchClient({ timeout: 15_000 })

export function listDeviceProfiles(config?: ApiRequestConfig) {
  return request.get<DeviceProfile[]>('/api/yt/device_profile/me/list', config)
}

export function listOrganizations(config?: ApiRequestConfig) {
  return request.get<Organization[]>('/api/yt/organization/me/list', config)
}

export function listDevices(query: DeviceQuery, config?: ApiRequestConfig) {
  return request.get<Device[]>('/api/yt/device/list', {
    ...config,
    params: { ...readParams(config?.params), ...query },
  })
}

export function getDeviceCredentials<TCredentials = unknown>(
  id: string,
  config?: ApiRequestConfig,
) {
  return request.get<TCredentials>(`/api/device/${encodeURIComponent(id)}/credentials`, config)
}

function readParams(params: ApiRequestConfig['params']) {
  if (!params) return {}
  if (params instanceof URLSearchParams) return Object.fromEntries(params.entries())
  return params
}
