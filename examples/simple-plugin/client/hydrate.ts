import { createClientI18n, createVueHydrateStore } from '@wry-smile/flowup/client'
import { PLUGIN_NAME } from '../constant'

export const $t = createClientI18n(RED, 'flowup-simple-plugin/simple-plugin', PLUGIN_NAME)

export interface HydrateStoreState extends SimplePluginClientNodeProperties {}

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
