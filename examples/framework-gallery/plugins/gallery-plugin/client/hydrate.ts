import { createClientI18n, createHydrateStore } from '@wry-smile/flowup/client'
import { PLUGIN_NAME } from '../constant'
import type { FrameworkGalleryGalleryPluginProperties } from '../types'

export const $t = createClientI18n(RED, 'flowup-framework-gallery/framework-gallery-plugins', PLUGIN_NAME)

export const DEFAULT_HYDRATE_STATE: FrameworkGalleryGalleryPluginProperties = {
  name: undefined,
  framework: 'Preact',
  mode: 'normal',
  enabled: true,
  price: 12,
  quantity: 2,
  items: ['Preact', 'Vue', 'Solid'],
}
export const store = createHydrateStore(DEFAULT_HYDRATE_STATE)
