import { batch, createSignal } from 'solid-js'

import { createHydrateRefs, HydrateCore } from './hydrate.core'

import type { HydrateRef, HydrateRefs, HydrateStore } from './hydrate.core'

export type SolidHydrateRefs<T extends object> = HydrateRefs<T>

export type SolidHydrateStore<T extends object> = HydrateStore<T, SolidHydrateRefs<T>>

function createSolidHydrateRef<T>(initialValue: T): HydrateRef<T> {
  const [getValue, setValue] = createSignal(initialValue)

  return {
    get value() {
      return getValue()
    },

    set value(value) {
      // 避免 T 本身是 function 时被 Solid 当 updater。
      setValue(() => value)
    },
  }
}

export function createSolidHydrateStore<T extends object>(defaults: T): SolidHydrateStore<T> {
  const refs = createHydrateRefs<T, SolidHydrateRefs<T>>(
    defaults,
    <K extends keyof T>(_key: K, value: T[K]) => {
      return createSolidHydrateRef(value)
    },
  )

  return new HydrateCore(defaults, refs, {
    transaction: fn => {
      batch(fn)
    },
  })
}
