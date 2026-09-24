import type { Signal } from '@preact/signals'
import { batch, signal } from '@preact/signals'

import { createHydrateRefs, HydrateCore } from './hydrate.core'

import type { HydrateStore } from './hydrate.core'

export type PreactHydrateRefs<T extends object> = {
  [K in keyof T]-?: Signal<T[K]>
}

export type PreactHydrateStore<T extends object> = HydrateStore<T, PreactHydrateRefs<T>>

export function createPreactHydrateStore<T extends object>(defaults: T): PreactHydrateStore<T> {
  const refs = createHydrateRefs<T, PreactHydrateRefs<T>>(
    defaults,
    <K extends keyof T>(_key: K, value: T[K]) => {
      return signal(value) as PreactHydrateRefs<T>[K]
    },
  )

  return new HydrateCore(defaults, refs, {
    transaction: fn => {
      batch(fn)
    },
  })
}
