export type HydrateSource<T extends object> = Readonly<Partial<T>>
export type HydrateTarget<T extends object> = Partial<T>

export interface HydrateRef<T> {
  value: T
}

export type HydrateRefs<T extends object> = {
  [K in keyof T]-?: HydrateRef<T[K]>
}

export interface HydrateStore<T extends object, TRefs extends HydrateRefs<T> = HydrateRefs<T>> {
  /**
   * 统一的响应式 state facade。
   *
   * state.xxx 实际代理到 refs.xxx.value。
   */
  readonly state: T

  /**
   * 字段级响应式引用。
   */
  readonly refs: TRefs

  /**
   * 外部数据 -> Store。
   *
   * source 缺失的字段使用 defaults。
   */
  hydrate(source: HydrateSource<T>): void

  patch<K extends keyof T>(key: K, value: T[K]): void

  /**
   * Store -> 外部对象。
   */
  commit(target: HydrateTarget<T>): void

  /**
   * 恢复 defaults。
   */
  reset(): void

  /**
   * 获取非响应式快照。
   */
  getSnapshot(): T
}

export interface HydrateCoreOptions {
  transaction?: (fn: () => void) => void
}

export function cloneHydrateValue<V>(value: V): V {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value
  }

  try {
    return structuredClone(value)
  } catch {
    // Node-RED 配置本身应该是 JSON 可序列化数据。
    return JSON.parse(JSON.stringify(value)) as V
  }
}

export function getHydrateKeys<T extends object>(value: T): Array<keyof T> {
  return Object.keys(value) as Array<keyof T>
}

/**
 * 根据不同框架的响应式 primitive 创建 refs。
 */
export function createHydrateRefs<T extends object, TRefs extends HydrateRefs<T>>(
  defaults: T,
  factory: <K extends keyof T>(key: K, value: T[K]) => TRefs[K],
): TRefs {
  const refs = {} as TRefs

  for (const key of getHydrateKeys(defaults)) {
    const ref = factory(key, cloneHydrateValue(defaults[key]))

    Object.defineProperty(refs, key, {
      enumerable: true,
      configurable: false,
      value: ref,
    })
  }

  return refs
}

export class HydrateCore<
  T extends object,
  TRefs extends HydrateRefs<T> = HydrateRefs<T>,
> implements HydrateStore<T, TRefs> {
  public readonly state: T
  public readonly refs: TRefs

  private readonly keys: Array<keyof T>
  private readonly defaults: T
  private readonly transaction: (fn: () => void) => void

  public constructor(defaults: T, refs: TRefs, options: HydrateCoreOptions = {}) {
    this.defaults = cloneHydrateValue(defaults)
    this.keys = getHydrateKeys(defaults)
    this.refs = refs

    this.transaction = options.transaction ?? (fn => fn())

    this.state = this.createStateFacade()
  }

  public hydrate = (source: HydrateSource<T>): void => {
    this.transaction(() => {
      for (const key of this.keys) {
        const value = this.hasOwn(source, key) ? source[key] : this.defaults[key]

        this.setField(key, value as T[typeof key])
      }
    })
  }

  public patch = <K extends keyof T>(key: K, value: T[K]): void => {
    this.transaction(() => this.setField(key, value))
  }

  public commit = (target: HydrateTarget<T>): void => {
    for (const key of this.keys) {
      this.assignField(target, key, cloneHydrateValue(this.refs[key].value) as T[typeof key])
    }
  }

  public reset = (): void => {
    this.hydrate({} as HydrateSource<T>)
  }

  public getSnapshot = (): T => {
    const result = {} as T

    for (const key of this.keys) {
      this.assignField(result, key, cloneHydrateValue(this.refs[key].value) as T[typeof key])
    }

    return result
  }

  private createStateFacade(): T {
    const state = {} as T

    for (const key of this.keys) {
      Object.defineProperty(state, key, {
        enumerable: true,
        configurable: false,

        get: () => {
          return this.refs[key].value
        },

        set: (value: T[typeof key]) => {
          this.refs[key].value = value
        },
      })
    }

    return state
  }

  private setField<K extends keyof T>(key: K, value: T[K]): void {
    this.refs[key].value = cloneHydrateValue(value)
  }

  private assignField<K extends keyof T>(target: Partial<T>, key: K, value: T[K]): void {
    target[key] = value
  }

  private hasOwn<O extends object>(target: O, key: PropertyKey): key is keyof O {
    return Object.hasOwn(target, key)
  }
}
