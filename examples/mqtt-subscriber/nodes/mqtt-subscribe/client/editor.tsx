import { FormRow, SearchSelect, TextInput, TreeSelect } from '@ui'
import type { OptionValue, SelectOption, TreeOption } from '@ui'
import { createSignal, onCleanup, onMount } from 'solid-js'

import { $t, store } from './hydrate'
import { useNodeRedSubmitValidation } from './use-node-red-submit-validation'

const products: SelectOption[] = [
  { value: 'product-environment-sensor', label: $t('options.products.environmentSensor') },
  { value: 'product-edge-gateway', label: $t('options.products.edgeGateway') },
  { value: 'product-water-meter', label: $t('options.products.waterMeter') },
]

const organizations: TreeOption[] = [
  {
    label: $t('options.organizations.headOffice'),
    children: [
      {
        label: $t('options.organizations.engineering'),
        children: [
          { label: $t('options.organizations.deviceLab'), value: 'organization-device-lab' },
          {
            label: $t('options.organizations.integrationLab'),
            value: 'organization-integration-lab',
          },
        ],
      },
      { label: $t('options.organizations.operations'), value: 'organization-operations' },
    ],
  },
  {
    label: $t('options.organizations.manufacturing'),
    children: [
      { label: $t('options.organizations.northPlant'), value: 'organization-north-plant' },
      { label: $t('options.organizations.southPlant'), value: 'organization-south-plant' },
    ],
  },
]

const devices = [
  {
    value: 'device-env-001',
    label: $t('options.devices.environmentSensor001'),
    productId: 'product-environment-sensor',
    organizationId: 'organization-device-lab',
  },
  {
    value: 'device-env-002',
    label: $t('options.devices.environmentSensor002'),
    productId: 'product-environment-sensor',
    organizationId: 'organization-integration-lab',
  },
  {
    value: 'device-gateway-001',
    label: $t('options.devices.edgeGateway001'),
    productId: 'product-edge-gateway',
    organizationId: 'organization-north-plant',
  },
  {
    value: 'device-meter-001',
    label: $t('options.devices.waterMeter001'),
    productId: 'product-water-meter',
    organizationId: 'organization-south-plant',
  },
]

function loadFixture<T>(options: T[], signal: AbortSignal, delay = 450): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Request aborted'))
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve(options)
    }, delay)
    const abort = () => {
      clearTimeout(timer)
      reject(new Error('Request aborted'))
    }
    signal.addEventListener('abort', abort, { once: true })
  })
}

export function MqttSubscribeEditor() {
  const [name, setName] = store.refs.name
  const [productId, setProductId] = store.refs.productId
  const [organizationId, setOrganizationId] = store.refs.organizationId
  const [deviceId, setDeviceId] = store.refs.deviceId
  const [submitAttempted, setSubmitAttempted] = createSignal(false)
  const [errors, setErrors] = createSignal({ productId: '', organizationId: '', deviceId: '' })
  const [productOptions, setProductOptions] = createSignal<SelectOption[]>([])
  const [organizationOptions, setOrganizationOptions] = createSignal<TreeOption[]>([])
  const [deviceOptions, setDeviceOptions] = createSignal<SelectOption[]>([])
  const [productsLoading, setProductsLoading] = createSignal(true)
  const [organizationsLoading, setOrganizationsLoading] = createSignal(true)
  const [devicesLoading, setDevicesLoading] = createSignal(false)
  let activeDeviceRequest: AbortController | undefined

  function validate(values = store.getSnapshot()) {
    const nextErrors = {
      productId: values.productId.trim() ? '' : $t('editor.productRequired'),
      organizationId: values.organizationId.trim() ? '' : $t('editor.organizationRequired'),
      deviceId: values.deviceId.trim() ? '' : $t('editor.deviceRequired'),
    }
    setErrors(nextErrors)
    return Object.values(nextErrors).every(error => !error)
  }

  function revalidateAfterChange() {
    if (submitAttempted()) validate()
  }

  useNodeRedSubmitValidation({
    onAttempt: () => setSubmitAttempted(true),
    validate: () => validate(),
    getMessage: () => Object.values(errors()).filter(Boolean),
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
      const matchingDevices = devices
        .filter(device => device.productId === productId)
        .filter(device => device.organizationId === organizationId)
        .map(({ value, label }) => ({ value, label }))
      const result = await loadFixture(matchingDevices, controller.signal, 550)
      if (!controller.signal.aborted) setDeviceOptions(result)
    } catch {
      if (!controller.signal.aborted) setDeviceOptions([])
    } finally {
      if (!controller.signal.aborted) setDevicesLoading(false)
    }
  }

  onMount(() => {
    const optionsController = new AbortController()
    void loadFixture(products, optionsController.signal, 350)
      .then(setProductOptions)
      .catch(() => {})
      .finally(() => setProductsLoading(false))
    void loadFixture(organizations, optionsController.signal, 500)
      .then(setOrganizationOptions)
      .catch(() => {})
      .finally(() => setOrganizationsLoading(false))

    const currentProductId = productId()
    const currentOrganizationId = organizationId()
    const currentDeviceId = deviceId()
    const validDevice = devices.some(
      device =>
        device.value === currentDeviceId &&
        device.productId === currentProductId &&
        device.organizationId === currentOrganizationId,
    )

    if (currentDeviceId && !validDevice) setDeviceId('')
    void refreshDeviceOptions(currentProductId, currentOrganizationId)

    onCleanup(() => {
      optionsController.abort()
      activeDeviceRequest?.abort()
    })
  })

  function updateProduct(value: OptionValue) {
    if (typeof value !== 'string') return
    setProductId(value)
    setDeviceId('')
    void refreshDeviceOptions(value, organizationId())
    revalidateAfterChange()
  }

  function updateOrganization(value: OptionValue) {
    if (typeof value !== 'string') return
    setOrganizationId(value)
    setDeviceId('')
    void refreshDeviceOptions(productId(), value)
    revalidateAfterChange()
  }

  function updateDevice(value: OptionValue) {
    if (typeof value === 'string') {
      setDeviceId(value)
      revalidateAfterChange()
    }
  }

  return (
    <div class="space-y-5 p-1">
      <FormRow label={$t('editor.name')} layout="vertical">
        <TextInput
          id="mqtt-subscribe-name"
          value={name() ?? ''}
          placeholder={$t('editor.namePlaceholder')}
          onInput={event => setName(event.currentTarget.value)}
        />
      </FormRow>

      <FormRow
        label={$t('editor.product')}
        layout="vertical"
        required
        error={submitAttempted() ? errors().productId : ''}
      >
        <SearchSelect
          id="mqtt-subscribe-product"
          options={productOptions()}
          loading={productsLoading()}
          loadingLabel={$t('editor.loadingProducts')}
          value={productId()}
          placeholder={$t('editor.selectProduct')}
          searchPlaceholder={$t('editor.searchProducts')}
          emptyLabel={$t('editor.noProducts')}
          status={submitAttempted() && errors().productId ? 'error' : undefined}
          onChange={updateProduct}
        />
      </FormRow>

      <FormRow
        label={$t('editor.organization')}
        layout="vertical"
        required
        error={submitAttempted() ? errors().organizationId : ''}
      >
        <TreeSelect
          id="mqtt-subscribe-organization"
          options={organizationOptions()}
          loading={organizationsLoading()}
          loadingLabel={$t('editor.loadingOrganizations')}
          value={organizationId()}
          placeholder={$t('editor.selectOrganization')}
          filterPlaceholder={$t('editor.searchOrganization')}
          emptyLabel={$t('editor.noOrganizations')}
          status={submitAttempted() && errors().organizationId ? 'error' : undefined}
          onChange={updateOrganization}
        />
      </FormRow>

      <FormRow
        label={$t('editor.device')}
        layout="vertical"
        required
        error={submitAttempted() ? errors().deviceId : ''}
      >
        <SearchSelect
          id="mqtt-subscribe-device"
          options={deviceOptions()}
          loading={devicesLoading()}
          loadingLabel={$t('editor.loadingDevices')}
          disabled={!productId() || !organizationId()}
          value={deviceId()}
          placeholder={$t('editor.selectDevice')}
          searchPlaceholder={$t('editor.searchDevices')}
          emptyLabel={$t('editor.noDevices')}
          status={submitAttempted() && errors().deviceId ? 'error' : undefined}
          onChange={updateDevice}
        />
      </FormRow>
    </div>
  )
}
