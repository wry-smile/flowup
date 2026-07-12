type StateSource<T extends object> = Readonly<Partial<T>>
type StateTarget<T extends object> = Partial<T>

export class HydrateStore<T extends object> {
  private readonly keys: Array<keyof T>
  private readonly defaults: T
  private readonly internalState: Partial<T> = {}

  public constructor(defaults: T) {
    this.defaults = this.cloneValue(defaults)
    this.keys = Object.keys(defaults) as Array<keyof T>
    this.reset()
  }

  public get state(): Readonly<Partial<T>> {
    return this.internalState
  }

  public hydrate(source: StateSource<T>): void {
    this.clearState()
    Object.assign(this.internalState, this.createDefaultState(), this.pickFields(source))
  }

  public patch(source: Readonly<Partial<T>>): void
  public patch<K extends keyof T>(key: K, value: T[K]): void
  public patch<K extends keyof T>(sourceOrKey: Readonly<Partial<T>> | K, value?: T[K]): void {
    if (this.isPropertyKey(sourceOrKey)) {
      this.patchField(sourceOrKey, value as T[K])
      return
    }

    this.patchFields(sourceOrKey)
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
    this.clearState()
    Object.assign(this.internalState, this.createDefaultState())
  }

  public getSnapshot(): Partial<T> {
    return this.pickFields(this.internalState)
  }

  private patchField<K extends keyof T>(key: K, value: T[K]): void {
    this.internalState[key] = this.cloneValue(value)
  }

  private patchFields(source: Readonly<Partial<T>>): void {
    Object.assign(this.internalState, this.pickFields(source))
  }

  private clearState(): void {
    for (const key of Object.keys(this.internalState) as Array<keyof T>) {
      delete this.internalState[key]
    }
  }

  private createDefaultState(): Partial<T> {
    const result: Partial<T> = {}
    for (const key of this.keys) {
      this.assignField(result, key, this.defaults[key])
    }
    return result
  }

  private pickFields(source: Readonly<Partial<T>>): Partial<T> {
    const result: Partial<T> = {}
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

  private hasOwn<O extends object>(target: O, key: PropertyKey): key is keyof O {
    return Object.hasOwn(target, key)
  }

  private isPropertyKey(value: unknown): value is keyof T {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol'
  }

  private cloneValue<V>(value: V): V {
    if (value === undefined || value === null || typeof value !== 'object')
      return value

    if (typeof structuredClone === 'function')
      return structuredClone(value)

    return JSON.parse(JSON.stringify(value)) as V
  }
}

export function createHydrateStore<T extends object>(defaults: T): HydrateStore<T> {
  return new HydrateStore(defaults)
}
