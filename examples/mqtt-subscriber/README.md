# MQTT subscriber multi-entry example

This package was scaffolded with `flowup gen package`, then given a SolidJS `mqtt-subscribe` node entry. That entry exposes separate MQTT In, MQTT Out, and MQTT Event Node-RED types through their scoped client and runtime entry modules. All SolidJS components were installed with `flowup gen component all` into the package-level `components/` directory and are available through `@ui`.

To recreate it from the repository root:

```sh
cd examples
flowup gen package mqtt-subscriber
cd mqtt-subscriber
flowup gen add node mqtt-subscribe --framework solid --unocss --locales en-US,zh-CN
flowup gen component all --framework solid
pnpm install
```

The editor demonstrates dependent selections: changing the product or organization clears the selected device and reloads the device options. It loads profiles, organizations, and devices through the shared API modules in `client-shared/api/`. Request functions and response types live in separate files. The Done button is intercepted when required values are missing; validation errors are stored by the form validator and shown beside their fields.

The MQTT In, MQTT Out, and MQTT Event runtime nodes use a shared MQTT connection pool keyed by the fixed broker connection configuration. MQTT In subscribes to the topic selected from the configured device type. Broker messages become Node-RED messages with `msg.topic`, parsed JSON (or the original text) in `msg.payload`, and `msg.deviceId`. MQTT Out publishes its incoming `msg.payload` to that device type's telemetry topic. MQTT Event publishes to the fixed `v1/devices/event/{entityId}/{identifier}` topic; `entityId` comes from the selected device and `identifier` is configured in the node editor. Each node type has its own editor state store; connections are released when nodes are closed or redeployed.

Configure the fixed MQTT connection in Node-RED's `settings.js`:

```js
module.exports = {
  flowup: {
    mqtt: {
      url: 'mqtt://localhost:1883',
      reconnectPeriod: 1000,
      connectTimeout: 30000,
    },
  },
}
```

`url` takes precedence over `host`; its hostname and explicit port are parsed from the URL. If it has no port, `port` is used before the protocol default. `http://...` and `mqtt://...` select `mqtt`; `https://...` and `mqtts://...` select `mqtts`. Set `secure: true` or `secure: false` to override scheme detection. For example, `https://broker.example.com:8883/path` resolves to `mqtts://broker.example.com:8883`; the URL path is ignored. Without `url`, `host` and `port` are used.

The broker connection can instead be configured with `FLOWUP_MQTT_URL` or `FLOWUP_MQTT_HOST`, `FLOWUP_MQTT_PORT` and optionally `FLOWUP_MQTT_SECURE` (`true` or `false`). Topics are derived from the selected device type: `Gateway` and `Direct` use `v1/devices/me/telemetry` and `v1/devices/me/rpc/request/+`; `Sensor` uses `v1/gateway/telemetry` and `v1/gateway/rpc`. The event report topic helper returns `v1/devices/event/{entityId}/{identifier}`.

Selecting a device loads its MQTT credentials from the device credentials API. Node-RED stores them as encrypted node credentials, and the runtime uses those node-bound credentials to connect. Device selection also determines the MQTT topics.

The API module can be reused by other nodes in this package:

```ts
import {
  getDeviceCredentials,
  listDeviceProfiles,
  listDevices,
  listOrganizations,
} from '@client-shared/api/request'

const profiles = await listDeviceProfiles()
const organizations = await listOrganizations()
const devices = await listDevices({
  organizationId,
  deviceProfileId,
})
const credentials = await getDeviceCredentials(deviceId)
```

The package also keeps an optional JSON-first fetch helper in `client-shared/fetch.ts`; it is example-local and is not part of Flowup's client API:

```ts
import { createFetchClient } from '@client-shared/fetch'

const api = createFetchClient({
  baseURL: '/api',
  timeout: 10_000,
  messageType: 'notify',
  requestType: 'json',
  responseType: 'auto',
  auth: {
    token: () => localStorage.getItem('accessToken'),
    header: 'Authorization',
    prefix: 'Bearer',
  },
})

const abortController = new AbortController()
const devices = await api.get<Device[]>('/devices', {
  params: { productId, organizationId },
  signal: abortController.signal,
})
```

It supports JSON request bodies, `URLSearchParams` query serialization, request and response interceptors, caller cancellation, timeout cancellation, and Node-RED `messageType` values `none`, `message`, and `notify`.
Authentication can be configured with a static token or a callback, a custom header name, and a token prefix. Set `auth: false` on an individual request to skip the configured token.
`requestType` controls how `data` is encoded (`json`, `text`, `formData`, `urlencoded`, or `raw`); `responseType` controls response parsing (`auto`, `json`, `text`, `blob`, `arrayBuffer`, or `formData`). Both can be set on the client or overridden per request.

```sh
pnpm typecheck
pnpm build
```
