import { createClientI18n, createHydrateStore } from '@wry-smile/flowup/client'
import { NODE_NAME } from '../constant'
import type { FrameworkGalleryVanillaNodeProperties } from '../types'

export const $t = createClientI18n(RED, 'flowup-framework-gallery/framework-gallery-nodes', NODE_NAME)

export const DEFAULT_HYDRATE_STATE: FrameworkGalleryVanillaNodeProperties = {
    name: undefined,
    framework: 'Vanilla',
    mode: 'normal',
    enabled: true,
    price: 12,
    quantity: 2,
    items: ['Vanilla', 'Vue', 'Solid'],
}

export function createVanillaHydrateStore() {
  return createHydrateStore(DEFAULT_HYDRATE_STATE)
}
