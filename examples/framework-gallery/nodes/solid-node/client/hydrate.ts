import { createClientI18n } from '@wry-smile/flowup/client'
import { createSolidHydrateStore } from '@wry-smile/flowup/client/solid'
import { NODE_NAME } from '../constant'
import type { FrameworkGallerySolidNodeProperties } from '../types'

export const $t = createClientI18n(RED, 'flowup-framework-gallery/framework-gallery-nodes', NODE_NAME)

export const DEFAULT_HYDRATE_STATE: FrameworkGallerySolidNodeProperties = {
  name: undefined,
  framework: 'Solid',
  mode: 'normal',
  enabled: true,
  price: 12,
  quantity: 2,
  items: ['Solid', 'Vue', 'Preact'],
}
export const store = createSolidHydrateStore(DEFAULT_HYDRATE_STATE)
