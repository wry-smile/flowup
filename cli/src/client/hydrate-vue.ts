import type { Ref, UnwrapNestedRefs } from 'vue'
import { reactive, toRaw, toRefs } from 'vue'

type StateSource<T extends object> = Readonly<Partial<T>>
type StateTarget<T extends object> = Partial<T>
type VueHydrateRefs<T extends object> = { [K in keyof T]-?: Ref<T[K]> }

export class VueHydrateStore<T extends object> {
  private readonly keys: Array<keyof T>
  private readonly defaults: T
  private readonly internalState: UnwrapNestedRefs<T>
  private readonly internalRefs: VueHydrateRefs<T>

  public constructor(defaults: T) {
    this.defaults = this.cloneValue(defaults)
    this.keys = Object.keys(defaults) as Array<keyof T>
    this.internalState = reactive(this.createDefaultState()) as UnwrapNestedRefs<T>
    this.internalRefs = toRefs(this.internalState) as VueHydrateRefs<T>
  }

  public get state(): UnwrapNestedRefs<T> {
    return this.internalState
  }

  public get refs(): VueHydrateRefs<T> {
    return this.internalRefs
  }

  public hydrate(source: StateSource<T>): void {
    this.replaceState({
      ...this.createDefaultState(),
      ...this.pickFields(source),
    })
  }

  public commit(target: StateTarget<T>): void {
    const snapshot = this.getSnapshot()
    for (const key of this.keys) {
      if (!this.hasOwn(snapshot, key))
        continue

      this.assignField(target, key, snapshot[key])
    }
  }

  public reset(): void {
    this.replaceState(this.createDefaultState())
  }

  public getSnapshot(): T {
    const rawState = toRaw(this.internalState) as unknown as T
    return this.pickFields(rawState)
  }

  private replaceState(source: Readonly<Partial<T>>): void {
    const nextState = {
      ...this.createDefaultState(),
      ...this.pickFields(source),
    } as T

    const target = this.toMutableState(this.internalState)
    for (const key of this.keys) {
      this.assignField(target, key, nextState[key])
    }
  }

  private createDefaultState(): T {
    const result = {} as T
    for (const key of this.keys) {
      this.assignField(result, key, this.defaults[key])
    }
    return result
  }

  private pickFields(source: Readonly<Partial<T>>): T {
    const result = this.createDefaultState()
    for (const key of this.keys) {
      if (!this.hasOwn(source, key))
        continue

      this.assignField(result, key, source[key])
    }
    return result
  }

  private assignField<K extends keyof T>(target: Partial<T>, key: K, value: T[K] | undefined): void {
    target[key] = this.cloneValue(value)
  }

  private toMutableState(state: UnwrapNestedRefs<T>): Partial<T> {
    return state as unknown as Partial<T>
  }

  private hasOwn<O extends object>(target: O, key: PropertyKey): key is keyof O {
    return Object.hasOwn(target, key)
  }

  private cloneValue<V>(value: V): V {
    if (value === undefined || value === null || typeof value !== 'object')
      return value

    const rawValue = toRaw(value)
    if (typeof structuredClone === 'function')
      return structuredClone(rawValue)

    return JSON.parse(JSON.stringify(rawValue)) as V
  }
}

export function createVueHydrateStore<T extends object>(defaults: T): VueHydrateStore<T> {
  return new VueHydrateStore(defaults)
}
