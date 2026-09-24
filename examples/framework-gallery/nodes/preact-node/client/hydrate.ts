import { createClientI18n } from '@wry-smile/flowup/client'
import { createPreactHydrateStore } from '@wry-smile/flowup/client/preact'
import { NODE_NAME } from '../constant'
import type { FrameworkGalleryPreactNodeProperties } from '../types'

export const $t = createClientI18n(RED, 'flowup-framework-gallery/framework-gallery-nodes', NODE_NAME)

export const DEFAULT_HYDRATE_STATE: FrameworkGalleryPreactNodeProperties = {
  name: undefined,
  framework: 'Preact',
  mode: 'normal',
  enabled: true,
  price: 12,
  quantity: 2,
  items: ['Preact', 'Vue', 'Solid'],
}
export const store = createPreactHydrateStore(DEFAULT_HYDRATE_STATE)
