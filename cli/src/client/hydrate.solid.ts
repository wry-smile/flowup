import { batch, createRoot, createSignal } from 'solid-js'

import { cloneHydrateValue, getHydrateKeys, HydrateCore } from './hydrate.core'

import type { Accessor, Setter } from 'solid-js'
import type { HydrateRef, HydrateRefs, HydrateStore } from './hydrate.core'

export type SolidHydrateRef<T> = [Accessor<T>, Setter<T>]

export type SolidHydrateRefs<T extends object> = {
  [K in keyof T]-?: SolidHydrateRef<T[K]>
}

export type SolidHydrateStore<T extends object> = Omit<HydrateStore<T>, 'refs' | 'patch'> & {
  readonly refs: SolidHydrateRefs<T>
}

export function createSolidHydrateStore<T extends object>(defaults: T): SolidHydrateStore<T> {
  return createRoot(() => {
    const refs = {} as SolidHydrateRefs<T>
    const coreRefs = {} as HydrateRefs<T>

    for (const key of getHydrateKeys(defaults)) {
      const [getValue, setValue] = createSignal(cloneHydrateValue(defaults[key]))

      Object.defineProperty(refs, key, {
        enumerable: true,
        configurable: false,
        value: [getValue, setValue],
      })

      const coreRef: HydrateRef<T[typeof key]> = {
        get value() {
          return getValue()
        },
        set value(value) {
          // Solid treats functions as updater callbacks; preserve them as data values.
          setValue(() => value)
        },
      }

      Object.defineProperty(coreRefs, key, {
        enumerable: true,
        configurable: false,
        value: coreRef,
      })
    }

    const core = new HydrateCore(defaults, coreRefs, {
      transaction: fn => batch(fn),
    })

    return {
      state: core.state,
      refs,
      hydrate: core.hydrate,
      commit: core.commit,
      reset: core.reset,
      getSnapshot: core.getSnapshot,
    }
  })
}
