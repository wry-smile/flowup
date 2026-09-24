import type { Ref } from 'vue'
import { shallowRef } from 'vue'

import { createHydrateRefs, HydrateCore } from './hydrate.core'

import type { HydrateStore } from './hydrate.core'

export type VueHydrateRefs<T extends object> = {
  [K in keyof T]-?: Ref<T[K]>
}

export type VueHydrateStore<T extends object> = HydrateStore<T, VueHydrateRefs<T>>

export function createVueHydrateStore<T extends object>(defaults: T): VueHydrateStore<T> {
  const refs = createHydrateRefs<T, VueHydrateRefs<T>>(
    defaults,
    <K extends keyof T>(_key: K, value: T[K]) => {
      return shallowRef(value) as VueHydrateRefs<T>[K]
    },
  )

  return new HydrateCore(defaults, refs)
}
