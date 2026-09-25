# MQTT subscriber multi-entry example

This package was scaffolded with `flowup gen package`, then given one SolidJS node named `mqtt-subscribe`. All SolidJS components were installed with `flowup gen component all` into the package-level `components/` directory and are available through `@ui`.

To recreate it from the repository root:

```sh
cd examples
flowup gen package mqtt-subscriber
cd mqtt-subscriber
flowup gen add node mqtt-subscribe --framework solid --unocss --locales en-US,zh-CN
flowup gen component all --framework solid
pnpm install
```

The editor demonstrates dependent selections: changing the product or organization clears the selected device and reloads the device options. Product, organization, and device options use delayed fixtures to show loading states. The Done button is intercepted when required values are missing; validation errors appear beside the fields and in the Node-RED editor notification.

The package also keeps an optional JSON-first fetch helper in `client-shared/fetch.ts`; it is example-local and is not part of Flowup's client API:

```ts
import { createFetchClient } from '@client-shared/fetch'

const api = createFetchClient({
  baseURL: '/api',
  timeout: 10_000,
  messageType: 'notify',
})

const abortController = new AbortController()
const devices = await api.get<Device[]>('/devices', {
  params: { productId, organizationId },
  signal: abortController.signal,
})
```

It supports JSON request bodies, `URLSearchParams` query serialization, request and response interceptors, caller cancellation, timeout cancellation, and Node-RED `messageType` values `none`, `message`, and `notify`.

```sh
pnpm typecheck
pnpm build
```
