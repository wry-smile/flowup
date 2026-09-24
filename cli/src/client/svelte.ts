import { writable } from 'svelte/store'

import { createHydrateRefs, HydrateCore } from './hydrate.core'
import type { HydrateRefs, HydrateSource, HydrateTarget } from './hydrate.core'
import type { Writable } from 'svelte/store'

export type SvelteHydrateStore<T extends object> = {
  readonly state: Writable<T>
  readonly refs: HydrateRefs<T>
  hydrate(source: HydrateSource<T>): void
  commit(target: HydrateTarget<T>): void
  reset(): void
  getSnapshot(): T
  patch<K extends keyof T>(key: K, value: T[K]): void
}

export function createSvelteHydrateStore<T extends object>(
  defaults: T,
): SvelteHydrateStore<T> {
  const refs = createHydrateRefs<T, HydrateRefs<T>>(defaults, (_key, value) => ({ value }))
  const core = new HydrateCore<T>(defaults, refs)
  const state = writable(core.getSnapshot())

  function sync(): void {
    state.set(core.getSnapshot())
  }

  return {
    state,
    refs,
    hydrate(source: HydrateSource<T>) {
      core.hydrate(source)
      sync()
    },
    patch<K extends keyof T>(key: K, value: T[K]) {
      core.patch(key, value)
      sync()
    },
    commit(target: HydrateTarget<T>) {
      core.commit(target)
    },
    reset() {
      core.reset()
      sync()
    },
    getSnapshot() {
      return core.getSnapshot()
    },
  }
}
