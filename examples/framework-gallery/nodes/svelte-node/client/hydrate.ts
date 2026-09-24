import { createClientI18n } from '@wry-smile/flowup/client'
import { createSvelteHydrateStore } from '@wry-smile/flowup/client/svelte'
import { NODE_NAME } from '../constant'

export const $t = createClientI18n(RED, 'flowup-framework-gallery/framework-gallery-nodes', NODE_NAME)

export interface HydrateStoreState extends FrameworkGallerySvelteNodeClientNodeProperties {}

export const DEFAULT_HYDRATE_STATE: HydrateStoreState = {
    name: undefined,
    framework: 'Svelte',
    mode: 'normal',
    enabled: true,
    price: 12,
    quantity: 2,
    items: ['Svelte', 'Vue', 'Solid'],
}

const store = createSvelteHydrateStore(DEFAULT_HYDRATE_STATE)

export function useHydrateStore() {
  return store
}
