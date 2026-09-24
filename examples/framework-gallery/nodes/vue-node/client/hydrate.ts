import { createClientI18n } from '@wry-smile/flowup/client'
import { createVueHydrateStore } from '@wry-smile/flowup/client/vue'
import { NODE_NAME } from '../constant'

export const $t = createClientI18n(RED, 'flowup-framework-gallery/framework-gallery-nodes', NODE_NAME)

export interface HydrateStoreState extends FrameworkGalleryVueNodeClientNodeProperties {}

export const DEFAULT_HYDRATE_STATE: HydrateStoreState = {
    name: undefined,
    framework: 'Vue',
    mode: 'normal',
    enabled: true,
    price: 12,
    quantity: 2,
    items: ['Vue', 'React', 'Solid'],
}

const hydrate = createVueHydrateStore(DEFAULT_HYDRATE_STATE)
export function useHydrateStore() {
  return hydrate
}
