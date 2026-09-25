export type FetchMessageType = 'none' | 'message' | 'notify'
export type FetchMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT'
export type FetchParamValue = string | number | boolean | null | undefined
export type FetchParams =
  | URLSearchParams
  | Record<string, FetchParamValue | readonly FetchParamValue[]>

export interface FetchRequestConfig extends Omit<RequestInit, 'body' | 'method'> {
  baseURL?: string
  data?: unknown
  messageType?: FetchMessageType
  params?: FetchParams
  timeout?: number
  method?: FetchMethod | (string & {})
}

export interface FetchClientConfig extends Omit<
  FetchRequestConfig,
  'data' | 'params' | 'timeout' | 'messageType' | 'method'
> {
  baseURL?: string
  fetch?: typeof globalThis.fetch
  messageType?: FetchMessageType
  /** Node-RED editor API. Defaults to globalThis.RED when available. */
  nodeRed?: {
    notify?: (
      message: string,
      options?: { fixed?: boolean; timeout?: number; type?: 'error' },
    ) => unknown
  }
  notifyTimeout?: number
  timeout?: number
}

export interface FetchRequestContext {
  url: string
  config: FetchRequestConfig
}

export type FetchRequestInterceptor = (
  context: FetchRequestContext,
) => FetchRequestContext | void | Promise<FetchRequestContext | void>

export type FetchResponseInterceptor = (
  data: unknown,
  response: Response,
  context: FetchRequestContext,
) => unknown | Promise<unknown>

export class FetchResponseError<T = unknown> extends Error {
  readonly data: T
  readonly response: Response
  readonly config: FetchRequestConfig

  constructor(response: Response, data: T, config: FetchRequestConfig) {
    super(getErrorMessage(data, response))
    this.name = 'FetchResponseError'
    this.data = data
    this.response = response
    this.config = config
  }
}

export class FetchTimeoutError extends Error {
  readonly timeout: number

  constructor(timeout: number) {
    super(`Request timed out after ${timeout} ms`)
    this.name = 'FetchTimeoutError'
    this.timeout = timeout
  }
}

export interface FetchClient {
  request<T = unknown>(url: string, config?: FetchRequestConfig): Promise<T>
  get<T = unknown>(url: string, config?: FetchRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: FetchRequestConfig): Promise<T>
  head<T = unknown>(url: string, config?: FetchRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: FetchRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: FetchRequestConfig): Promise<T>
  patch<T = unknown>(url: string, data?: unknown, config?: FetchRequestConfig): Promise<T>
  interceptors: {
    request: { use(interceptor: FetchRequestInterceptor): () => void }
    response: { use(interceptor: FetchResponseInterceptor): () => void }
  }
}

/** Create a small JSON-first fetch client for Node-RED editor code. */
export function createFetchClient(defaults: FetchClientConfig = {}): FetchClient {
  const requestInterceptors: FetchRequestInterceptor[] = []
  const responseInterceptors: FetchResponseInterceptor[] = []
  const fetcher = defaults.fetch ?? globalThis.fetch

  if (typeof fetcher !== 'function') {
    throw new Error(
      'Fetch is not available. Provide a fetch implementation in createFetchClient().',
    )
  }

  const request = async <T>(url: string, requestConfig: FetchRequestConfig = {}): Promise<T> => {
    let context: FetchRequestContext = { url, config: { ...requestConfig } }
    let timedOut = false
    let externallyAborted = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let removeAbortListener: (() => void) | undefined

    try {
      for (const interceptor of requestInterceptors) {
        const next = await interceptor(context)
        if (next) context = next
      }

      const config = context.config
      const timeout = config.timeout ?? defaults.timeout
      const controller = new AbortController()
      const externalSignal = config.signal

      if (externalSignal) {
        const abort = () => {
          externallyAborted = true
          controller.abort(externalSignal.reason)
        }
        if (externalSignal.aborted) abort()
        else {
          externalSignal.addEventListener('abort', abort, { once: true })
          removeAbortListener = () => externalSignal.removeEventListener('abort', abort)
        }
      }

      if (timeout !== undefined && timeout > 0) {
        timeoutId = setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeout)
      }

      const finalUrl = appendParams(
        combineBaseUrl(config.baseURL ?? defaults.baseURL, context.url),
        config.params,
      )
      const headers = new Headers(defaults.headers)
      new Headers(config.headers).forEach((value, key) => headers.set(key, value))
      const init: RequestInit = {
        ...defaults,
        ...config,
        method: config.method ?? 'GET',
        headers,
        signal: controller.signal,
      }
      delete (init as FetchRequestConfig).baseURL
      delete (init as FetchRequestConfig).data
      delete (init as FetchRequestConfig).params
      delete (init as FetchRequestConfig).timeout
      delete (init as FetchRequestConfig).messageType

      if (config.data !== undefined) {
        if (isBodyInit(config.data)) {
          init.body = config.data
        } else {
          init.body = JSON.stringify(config.data)
          if (!headers.has('content-type')) headers.set('content-type', 'application/json')
        }
      }

      const response = await fetcher(finalUrl, init)
      let data: unknown = await parseResponse(response)
      for (const interceptor of responseInterceptors)
        data = await interceptor(data, response, context)

      if (!response.ok) throw new FetchResponseError(response, data, config)

      return data as T
    } catch (cause) {
      const config = context.config
      const error = timedOut
        ? new FetchTimeoutError(config.timeout ?? defaults.timeout ?? 0)
        : cause

      if (!externallyAborted && !(error instanceof DOMException && error.name === 'AbortError'))
        showErrorMessage(error, config.messageType ?? defaults.messageType ?? 'none', defaults)

      throw error
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      removeAbortListener?.()
    }
  }

  const withMethod =
    (method: FetchMethod) =>
    <T = unknown>(url: string, config: FetchRequestConfig = {}) =>
      request<T>(url, { ...config, method })
  const withData =
    (method: FetchMethod) =>
    <T = unknown>(url: string, data?: unknown, config: FetchRequestConfig = {}) =>
      request<T>(url, { ...config, method, data })

  return {
    request,
    get: withMethod('GET'),
    delete: withMethod('DELETE'),
    head: withMethod('HEAD'),
    post: withData('POST'),
    put: withData('PUT'),
    patch: withData('PATCH'),
    interceptors: {
      request: {
        use(interceptor) {
          requestInterceptors.push(interceptor)
          return () => removeInterceptor(requestInterceptors, interceptor)
        },
      },
      response: {
        use(interceptor) {
          responseInterceptors.push(interceptor)
          return () => removeInterceptor(responseInterceptors, interceptor)
        },
      },
    },
  }
}

function removeInterceptor<T>(interceptors: T[], interceptor: T) {
  const index = interceptors.indexOf(interceptor)
  if (index >= 0) interceptors.splice(index, 1)
}

function combineBaseUrl(baseURL: string | undefined, url: string) {
  if (!baseURL || /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function appendParams(url: string, params?: FetchParams) {
  if (!params) return url

  const hashIndex = url.indexOf('#')
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url
  const queryIndex = withoutHash.indexOf('?')
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const search = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '')

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => search.append(key, value))
  } else {
    for (const [key, rawValue] of Object.entries(params)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue]
      for (const value of values) {
        if (value !== null && value !== undefined) search.append(key, String(value))
      }
    }
  }

  const query = search.toString()
  return `${path}${query ? `?${query}` : ''}${hash}`
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined

  const text = await response.text()
  if (!text) return undefined

  if (response.headers.get('content-type')?.toLowerCase().includes('json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof ReadableStream
  )
}

function getErrorMessage(data: unknown, response: Response) {
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>
    const message = body.message ?? body.error
    if (typeof message === 'string' && message.trim()) return message
  }
  return response.statusText || `Request failed with status ${response.status}`
}

function showErrorMessage(
  error: unknown,
  messageType: FetchMessageType,
  defaults: FetchClientConfig,
) {
  if (messageType === 'none') return

  const red =
    defaults.nodeRed ??
    (
      globalThis as typeof globalThis & {
        RED?: FetchClientConfig['nodeRed']
      }
    ).RED
  if (!red?.notify) return

  const message = error instanceof Error ? error.message : String(error)
  try {
    if (messageType === 'message') red.notify(message, { type: 'error', fixed: true })
    else red.notify(message, { type: 'error', timeout: defaults.notifyTimeout ?? 5000 })
  } catch {
    // A notification failure must not replace the request error.
  }
}
