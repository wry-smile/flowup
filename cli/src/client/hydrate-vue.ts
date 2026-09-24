import type { ToRefs, UnwrapNestedRefs } from 'vue'
import { reactive, toRaw, toRefs } from 'vue'

type StateSource<T extends object> = Readonly<Partial<T>>
type StateTarget<T extends object> = Partial<T>

type VueHydrateRefs<T extends object> = ToRefs<UnwrapNestedRefs<T>>

export class VueHydrateStore<T extends object> {
  private readonly keys: Array<keyof T>
  private readonly defaults: T

  private readonly internalState: UnwrapNestedRefs<T>
  private readonly internalRefs: VueHydrateRefs<T>

  public constructor(defaults: T) {
    this.defaults = this.cloneValue(defaults)
    this.keys = Object.keys(this.defaults) as Array<keyof T>

    this.internalState = reactive(this.cloneValue(this.defaults)) as UnwrapNestedRefs<T>

    this.internalRefs = toRefs(this.internalState) as VueHydrateRefs<T>
  }

  public get state(): UnwrapNestedRefs<T> {
    return this.internalState
  }

  public get refs(): VueHydrateRefs<T> {
    return this.internalRefs
  }

  public hydrate = (source: StateSource<T>): void => {
    this.replaceState(source)
  }

  public commit = (target: StateTarget<T>): void => {
    const source = toRaw(this.internalState) as unknown as T

    for (const key of this.keys) {
      this.assignField(target, key, source[key])
    }
  }

  public reset = (): void => {
    this.replaceState({} as StateSource<T>)
  }

  public getSnapshot = (): T => {
    const source = toRaw(this.internalState) as unknown as T
    const result = {} as T

    for (const key of this.keys) {
      this.assignField(result, key, source[key])
    }

    return result
  }

  private replaceState(source: StateSource<T>): void {
    const target = this.internalState as unknown as Partial<T>

    for (const key of this.keys) {
      const value = this.hasOwn(source, key) ? source[key] : this.defaults[key]

      this.assignField(target, key, value)
    }
  }

  private assignField<K extends keyof T>(
    target: Partial<T>,
    key: K,
    value: T[K] | undefined,
  ): void {
    target[key] = this.cloneValue(value)
  }

  private hasOwn<O extends object>(target: O, key: PropertyKey): key is keyof O {
    return Object.hasOwn(target, key)
  }

  private cloneValue<V>(value: V): V {
    if (value === undefined || value === null || typeof value !== 'object') {
      return value
    }

    const rawValue = toRaw(value)

    if (typeof structuredClone === 'function') {
      return structuredClone(rawValue)
    }

    return JSON.parse(JSON.stringify(rawValue)) as V
  }
}

export function createVueHydrateStore<T extends object>(defaults: T): VueHydrateStore<T> {
  return new VueHydrateStore(defaults)
}
