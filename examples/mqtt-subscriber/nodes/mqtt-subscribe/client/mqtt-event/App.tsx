import { ComponentShowcase, FormRow, SearchSelect, TextInput, TreeSelect } from '@ui'
import type { OptionValue, SelectOption, TreeOption } from '@ui'
import { isArray, isObject } from '@wry-smile/utils'
import { createSignal, onCleanup, onMount } from 'solid-js'
import type { SolidHydrateStore } from '@wry-smile/flowup/client/solid'
import type { MqttSubscriberMqttEventProperties } from '../../types'
import {
  getDeviceCredentials,
  listDeviceProfiles,
  listDevices,
  listOrganizations,
} from '@client-shared/api/request'
import type {
  ApiListResponse,
  DeviceCredentials,
  DeviceProfile,
  Organization,
} from '@client-shared/api/types'

import { useFormValidation } from '../shared/use-form-validation'
import type { FormValidationSchema } from '../shared/use-form-validation'
import { useNodeRedDialogSubmitGuard } from '../shared/use-node-red-dialog-submit-guard'

type MqttEventEditorStore = Pick<
  SolidHydrateStore<MqttSubscriberMqttEventProperties>,
  'refs' | 'getSnapshot'
>

type MqttEventEditorValues = MqttSubscriberMqttEventProperties

interface MqttEventEditorProps {
  store: MqttEventEditorStore
  t: (key: string) => string
  idPrefix: string
}

export default function App(props: MqttEventEditorProps) {
  const store = props.store
  const t = props.t
  const idPrefix = props.idPrefix
  const [name, setName] = store.refs.name
  const [productId, setProductId] = store.refs.productId
  const [organizationId, setOrganizationId] = store.refs.organizationId
  const [deviceId, setDeviceId] = store.refs.deviceId
  const [identifier, setIdentifier] = store.refs.identifier
  const [, setDeviceType] = store.refs.deviceType
  const schema: FormValidationSchema<MqttEventEditorValues> = {
    productId: { required: t('editor.productRequired') },
    organizationId: { required: t('editor.organizationRequired') },
    deviceId: { required: t('editor.deviceRequired') },
    identifier: {
      required: t('editor.identifierRequired'),
      rules: [
        {
          validate: value =>
            typeof value === 'string' &&
            !value.includes('/') &&
            !value.includes('+') &&
            !value.includes('#'),
          message: t('editor.invalidIdentifier'),
        },
      ],
    },
  }
  const validation = useFormValidation<MqttEventEditorValues>({
    getValues: () => store.getSnapshot(),
    schema,
  })
  const productField = validation.field('productId')
  const organizationField = validation.field('organizationId')
  const deviceField = validation.field('deviceId')
  const identifierField = validation.field('identifier')
  const [productOptions, setProductOptions] = createSignal<SelectOption[]>([])
  const [organizationOptions, setOrganizationOptions] = createSignal<TreeOption[]>([])
  const [deviceOptions, setDeviceOptions] = createSignal<SelectOption[]>([])
  const [productsLoading, setProductsLoading] = createSignal(true)
  const [organizationsLoading, setOrganizationsLoading] = createSignal(true)
  const [devicesLoading, setDevicesLoading] = createSignal(false)
  const [credentialsStatus, setCredentialsStatus] = createSignal<
    'loading' | 'error' | 'ready' | ''
  >('')
  let activeDeviceRequest: AbortController | undefined
  let activeCredentialsRequest: AbortController | undefined
  let deviceTypes = new Map<string, string | undefined>()

  function clearCredentials() {
    $('#node-input-username').val('')
    $('#node-input-password').val('')
    setCredentialsStatus('')
  }

  async function loadDeviceCredentials(id: string) {
    activeCredentialsRequest?.abort()
    clearCredentials()
    if (!id) return

    const controller = new AbortController()
    activeCredentialsRequest = controller
    setCredentialsStatus('loading')
    try {
      const response = await getDeviceCredentials<DeviceCredentials>(id, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const credentials = unwrapCredentials(response)
      const username =
        credentials.username ??
        credentials.credentialsId ??
        credentials.token ??
        credentials.accessToken
      const password = credentials.password ?? credentials.credentialsValue
      if (!username) {
        setCredentialsStatus('error')
        return
      }
      $('#node-input-username').val(username)
      $('#node-input-password').val(password ?? '')
      setCredentialsStatus('ready')
    } catch {
      if (!controller.signal.aborted) setCredentialsStatus('error')
    }
  }

  useNodeRedDialogSubmitGuard({
    canSubmit: () => {
      const valid = validation.validate()
      return valid && credentialsStatus() === 'ready'
    },
  })

  async function refreshDeviceOptions(productId: string, organizationId: string) {
    activeDeviceRequest?.abort()

    if (!productId || !organizationId) {
      setDeviceOptions([])
      setDevicesLoading(false)
      return
    }

    const controller = new AbortController()
    activeDeviceRequest = controller
    setDeviceOptions([])
    setDevicesLoading(true)

    try {
      const response = await listDevices(
        { organizationId, deviceProfileId: productId },
        { signal: controller.signal },
      )
      if (!controller.signal.aborted) {
        const devices = readList(response)
        deviceTypes = new Map(devices.map(device => [device.id, device.deviceType]))
        setDeviceOptions(devices.map(device => ({ value: device.id, label: device.name })))
      }
    } catch {
      if (!controller.signal.aborted) setDeviceOptions([])
    } finally {
      if (!controller.signal.aborted) setDevicesLoading(false)
    }
  }

  onMount(() => {
    const optionsController = new AbortController()
    void listDeviceProfiles({ signal: optionsController.signal })
      .then(response =>
        setProductOptions(
          readList(response).map(profile => ({ value: profile.id, label: profile.name })),
        ),
      )
      .catch(() => {})
      .finally(() => setProductsLoading(false))
    void listOrganizations({ signal: optionsController.signal })
      .then(response => setOrganizationOptions(readList(response).map(toTreeOption)))
      .catch(() => {})
      .finally(() => setOrganizationsLoading(false))

    const currentProductId = productId()
    const currentOrganizationId = organizationId()
    void refreshDeviceOptions(currentProductId, currentOrganizationId)
    void loadDeviceCredentials(deviceId())

    onCleanup(() => {
      optionsController.abort()
      activeDeviceRequest?.abort()
      activeCredentialsRequest?.abort()
    })
  })

  function updateProduct(value: OptionValue) {
    if (typeof value !== 'string') return
    setProductId(value)
    setDeviceId('')
    setDeviceType('')
    clearCredentials()
    void refreshDeviceOptions(value, organizationId())
    validation.revalidate()
  }

  function updateOrganization(value: OptionValue) {
    if (typeof value !== 'string') return
    setOrganizationId(value)
    setDeviceId('')
    setDeviceType('')
    clearCredentials()
    void refreshDeviceOptions(productId(), value)
    validation.revalidate()
  }

  function updateDevice(value: OptionValue) {
    if (typeof value === 'string') {
      setDeviceId(value)
      setDeviceType(deviceTypes.get(value) ?? '')
      void loadDeviceCredentials(value)
      validation.revalidate()
    }
  }

  return (
    <main class="grid gap-3 p-3" data-flowup-scope="mqtt-subscriber">
      <div class="space-y-5 p-1">
        <ComponentShowcase />
        <FormRow label={t('editor.name')} layout="vertical">
          <TextInput
            id={`${idPrefix}-name`}
            value={name() ?? ''}
            placeholder={t('editor.namePlaceholder')}
            onInput={event => setName(event.currentTarget.value)}
          />
        </FormRow>

        <FormRow
          label={t('editor.identifier')}
          layout="vertical"
          required
          error={identifierField.error()}
        >
          <TextInput
            id={`${idPrefix}-identifier`}
            value={identifier()}
            placeholder={t('editor.identifierPlaceholder')}
            status={identifierField.status()}
            onInput={event => {
              setIdentifier(event.currentTarget.value)
              validation.revalidate()
            }}
          />
        </FormRow>

        <FormRow
          label={t('editor.product')}
          layout="vertical"
          required
          error={productField.error()}
        >
          <SearchSelect
            id={`${idPrefix}-product`}
            options={productOptions()}
            loading={productsLoading()}
            loadingLabel={t('editor.loadingProducts')}
            value={productId()}
            placeholder={t('editor.selectProduct')}
            searchPlaceholder={t('editor.searchProducts')}
            emptyLabel={t('editor.noProducts')}
            status={productField.status()}
            onChange={updateProduct}
          />
        </FormRow>

        <FormRow
          label={t('editor.organization')}
          layout="vertical"
          required
          error={organizationField.error()}
        >
          <TreeSelect
            id={`${idPrefix}-organization`}
            options={organizationOptions()}
            loading={organizationsLoading()}
            loadingLabel={t('editor.loadingOrganizations')}
            value={organizationId()}
            placeholder={t('editor.selectOrganization')}
            filterPlaceholder={t('editor.searchOrganization')}
            emptyLabel={t('editor.noOrganizations')}
            status={organizationField.status()}
            onChange={updateOrganization}
          />
        </FormRow>

        <FormRow label={t('editor.device')} layout="vertical" required error={deviceField.error()}>
          <SearchSelect
            id={`${idPrefix}-device`}
            options={deviceOptions()}
            loading={devicesLoading()}
            loadingLabel={t('editor.loadingDevices')}
            disabled={!productId() || !organizationId()}
            value={deviceId()}
            placeholder={t('editor.selectDevice')}
            searchPlaceholder={t('editor.searchDevices')}
            emptyLabel={t('editor.noDevices')}
            status={deviceField.status()}
            onChange={updateDevice}
          />
        </FormRow>
        <p class="text-xs text-slate-500" aria-live="polite">
          {credentialsStatus() === 'loading'
            ? t('editor.loadingCredentials')
            : credentialsStatus() === 'error'
              ? t('editor.credentialsUnavailable')
              : ''}
        </p>
      </div>
    </main>
  )
}

function unwrapCredentials(value: DeviceCredentials): DeviceCredentials {
  if (value.data) return unwrapCredentials(value.data)
  if (value.result) return unwrapCredentials(value.result)
  return value
}

function readList<T>(response: ApiListResponse<T>): T[] {
  if (isArray(response)) return response as T[]
  if (!isObject(response)) throw new TypeError('Expected the API response to contain a list.')

  const payload = response as Record<string, unknown>
  for (const key of ['list', 'items', 'records', 'rows']) {
    const items = payload[key]
    if (isArray(items)) return items as T[]
  }
  if (payload.data !== undefined) return readList(payload.data as ApiListResponse<T>)
  if (payload.result !== undefined) return readList(payload.result as ApiListResponse<T>)
  throw new TypeError('Expected the API response to contain a list.')
}

function toTreeOption(organization: Organization): TreeOption {
  return {
    label: organization.name,
    value: organization.id,
    ...(organization.children?.length
      ? { children: organization.children.map(child => toTreeOption(child)) }
      : {}),
  }
}
