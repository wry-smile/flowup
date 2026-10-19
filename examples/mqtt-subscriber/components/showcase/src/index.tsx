import { createSignal } from 'solid-js'

import { Alert } from '../../alert'
import { AsyncSearchSelect } from '../../async-search-select'
import { Button } from '../../button'
import { CodeEditor } from '../../code-editor'
import { Checkbox } from '../../checkbox'
import { CheckboxGroup } from '../../checkbox-group'
import { Collapse } from '../../collapse'
import { Dialog } from '../../dialog'
import { Drawer } from '../../drawer'
import { DateTimePicker, type DateTimeValue } from '../../date-time-picker'
import { EditableList, type EditableListItemProps } from '../../editable-list'
import { FormRow } from '../../form-row'
import { IconButton } from '../../icon-button'
import { Icon } from '../../icons'
import { TextInput } from '../../input'
import { InputGroup } from '../../input-group'
import { InputNumber } from '../../input-number'
import { Loading } from '../../loading'
import { MultiSelect } from '../../multi-select'
import { Popover } from '../../popover'
import { RangeInput } from '../../range-input'
import { Radio } from '../../radio'
import { RadioGroup } from '../../radio-group'
import { SearchSelect } from '../../search-select'
import { Segmented } from '../../segmented'
import { Select, type OptionValue } from '../../select'
import { Switch } from '../../switch'
import { Tabs } from '../../tabs'
import { Tag } from '../../tag'
import { Textarea } from '../../textarea'
import { Tooltip } from '../../tooltip'
import { TreeSelect, type TreeOption } from '../../tree-select'
import { TypedInput, type TypedInputType, type TypedInputValue } from '../../typed-input'

const methods = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
]

const typedOptions = [
  { value: false, label: 'Disabled (false)' },
  { value: 3, label: 'Retry 3 times (number)' },
  { value: 'auto', label: 'Automatic (string)' },
]
const typedChoiceOptions = [
  { value: true, label: 'Enabled (true)' },
  { value: 3, label: 'Three (number)' },
  { value: 'auto', label: 'Automatic (string)' },
]
const dataSources = [
  'HTTP Request',
  'MQTT Broker',
  'WebSocket',
  'InfluxDB',
  'PostgreSQL',
  'Redis',
].map(value => ({ value, label: value }))
const asyncDataSources = [
  ...dataSources,
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'kafka', label: 'Apache Kafka' },
]
const outputOptions = ['Payload', 'Headers', 'Status Code', 'Topic'].map(value => ({
  value: value.toLowerCase().replaceAll(' ', '-'),
  label: value,
}))
const treeOptions: TreeOption[] = [
  {
    label: 'Global',
    children: [
      {
        label: 'settings',
        children: [{ label: 'timeout' }, { label: 'retries' }],
      },
      { label: 'config' },
    ],
  },
  { label: 'Flow', children: [{ label: 'request' }, { label: 'response' }] },
  { label: 'Node', children: [{ label: 'id' }, { label: 'name' }] },
]

interface EditableMapping {
  property: string
  payloadKey: string
}

const iconNames = [
  'check',
  'chevron-down',
  'chevron-right',
  'close',
  'search',
  'spinner',
  'caret-down',
  'caret-up',
] as const

export function ComponentShowcase() {
  const [name, setName] = createSignal('HTTP Request')
  const [timeout, setTimeoutValue] = createSignal(10000)
  const [method, setMethod] = createSignal<OptionValue>('GET')
  const [typedValue, setTypedValue] = createSignal<OptionValue>(false)
  const [typedChecks, setTypedChecks] = createSignal<OptionValue[]>([true, 3])
  const [typedRadio, setTypedRadio] = createSignal<OptionValue>('auto')
  const [source, setSource] = createSignal<OptionValue>('')
  const [asyncSource, setAsyncSource] = createSignal<OptionValue>('')
  const [outputs, setOutputs] = createSignal<OptionValue[]>([])
  const [treeValue, setTreeValue] = createSignal<OptionValue>('Global / settings / timeout')
  const [trigger, setTrigger] = createSignal<OptionValue>('Manual')
  const [cache, setCache] = createSignal(true)
  const [enabledOutputs, setEnabledOutputs] = createSignal<OptionValue[]>(['payload', 'headers'])
  const [defaultOutput, setDefaultOutput] = createSignal(true)
  const [responseMode, setResponseMode] = createSignal<OptionValue>('Automatic')
  const [retry, setRetry] = createSignal(true)
  const [followRedirects, setFollowRedirects] = createSignal(false)
  const [saved, setSaved] = createSignal(false)
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [drawerOpen, setDrawerOpen] = createSignal(false)
  const [mappings, setMappings] = createSignal<EditableMapping[]>([
    { property: 'temperature', payloadKey: 'temperature' },
    { property: 'enabled', payloadKey: 'status.enabled' },
  ])
  const [typedInputType, setTypedInputType] = createSignal<TypedInputType>('str')
  const [typedInputValue, setTypedInputValue] = createSignal<TypedInputValue>('payload')
  const [code, setCode] = createSignal('return msg.payload;')
  const [runAt, setRunAt] = createSignal('2026-10-19 09:30:15')
  const [runTime, setRunTime] = createSignal('09:30:15')
  const [dateRange, setDateRange] = createSignal<DateTimeValue>({
    start: '2026-10-01',
    end: '2026-10-19',
  })
  const [scheduleRange, setScheduleRange] = createSignal<DateTimeValue>({
    start: '2026-10-01 09:00:00',
    end: '2026-10-19 17:30:00',
  })
  const [threshold, setThreshold] = createSignal(65)
  const [popoverOpen, setPopoverOpen] = createSignal(false)

  function reset() {
    setName('HTTP Request')
    setTimeoutValue(10000)
    setMethod('GET')
    setTypedValue(false)
    setTypedChecks([true, 3])
    setTypedRadio('auto')
    setSource('')
    setAsyncSource('')
    setOutputs([])
    setTreeValue('Global / settings / timeout')
    setTrigger('Manual')
    setCache(true)
    setEnabledOutputs(['payload', 'headers'])
    setDefaultOutput(true)
    setResponseMode('Automatic')
    setRetry(true)
    setFollowRedirects(false)
    setSaved(false)
    setMappings([
      { property: 'temperature', payloadKey: 'temperature' },
      { property: 'enabled', payloadKey: 'status.enabled' },
    ])
    setTypedInputType('str')
    setTypedInputValue('payload')
    setCode('return msg.payload;')
    setRunAt('2026-10-19 09:30:15')
    setDateRange({ start: '2026-10-01', end: '2026-10-19' })
    setScheduleRange({ start: '2026-10-01 09:00:00', end: '2026-10-19 17:30:00' })
    setThreshold(65)
    setPopoverOpen(false)
  }

  function changed<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setSaved(false)
    }
  }

  return (
    <main class="mx-auto max-w-[1100px] bg-(--fui-surface-hover) px-3 py-3 text-(--fui-text)">
      <header class="mb-4">
        <h1 class="m-0 text-[22px] font-semibold">Node-RED Form Components</h1>
        <p class="mt-1 mb-0 text-[13px] text-(--fui-interactive)">
          Solid components · UnoCSS · Node configuration preview
        </p>
      </header>

      <section class="overflow-visible rounded-(--fui-radius) border border-(--fui-border-soft) bg-(--fui-surface)">
        <div class="flex h-(--fui-header-height) items-center border-b border-(--fui-border-soft) px-4">
          <span class="text-[14px] font-semibold">Node properties</span>
        </div>

        <div class="space-y-5 p-4">
          <FormRow label="Name">
            <TextInput
              value={name()}
              onInput={event => changed(setName)(event.currentTarget.value)}
              description="Optional display name for this node."
            />
          </FormRow>

          <FormRow label="Timeout">
            <InputNumber
              value={timeout()}
              min={0}
              step={1000}
              unit="milliseconds"
              onChange={changed(setTimeoutValue)}
            />
          </FormRow>

          <FormRow label="Method">
            <Select options={methods} value={method()} onChange={changed(setMethod)} />
          </FormRow>

          <FormRow label="Typed Option Values" layout="vertical">
            <div class="space-y-3">
              <Select
                options={typedOptions}
                value={typedValue()}
                onChange={changed(setTypedValue)}
              />
              <Segmented
                options={typedOptions}
                value={typedValue()}
                onChange={changed(setTypedValue)}
              />
              <CheckboxGroup
                options={typedChoiceOptions}
                value={typedChecks()}
                onChange={changed(setTypedChecks)}
              />
              <RadioGroup
                name="typed-values"
                options={typedChoiceOptions}
                value={typedRadio()}
                onChange={changed(setTypedRadio)}
              />
            </div>
          </FormRow>

          <FormRow label="Search Select">
            <SearchSelect
              options={dataSources}
              value={source()}
              placeholder="Select data source..."
              onChange={changed(setSource)}
            />
          </FormRow>

          <FormRow label="Async Search Select">
            <AsyncSearchSelect
              value={asyncSource()}
              placeholder="Search remote data sources..."
              searchPlaceholder="Type to search..."
              loadingLabel="Searching data sources..."
              debounceMs={300}
              loadOptions={async (query, signal) => {
                await new Promise<void>((resolve, reject) => {
                  const timeout = setTimeout(resolve, 350)
                  signal.addEventListener(
                    'abort',
                    () => {
                      clearTimeout(timeout)
                      reject(new DOMException('Request aborted', 'AbortError'))
                    },
                    { once: true },
                  )
                })
                const normalizedQuery = query.trim().toLowerCase()
                return asyncDataSources.filter(option =>
                  option.label.toLowerCase().includes(normalizedQuery),
                )
              }}
              onChange={value => changed(setAsyncSource)(value)}
            />
          </FormRow>

          <FormRow label="Multi Select">
            <MultiSelect
              options={outputOptions}
              value={outputs()}
              placeholder="Select outputs..."
              onChange={changed(setOutputs)}
            />
          </FormRow>

          <FormRow label="Tree Select">
            <TreeSelect
              options={treeOptions}
              value={treeValue()}
              onChange={changed(setTreeValue)}
            />
          </FormRow>

          <FormRow label="Typed Input">
            <TypedInput
              value={typedInputValue()}
              type={typedInputType()}
              onChange={(value, type) => {
                setTypedInputValue(value)
                setTypedInputType(type)
              }}
              placeholder="Enter a value"
            />
          </FormRow>

          <FormRow label="Trigger" labelClass="min-h-(--fui-button-height)">
            <Segmented
              options={['Manual', 'Interval', 'Cron']}
              value={trigger()}
              onChange={changed(setTrigger)}
            />
          </FormRow>

          <FormRow label="Checkbox" labelClass="min-h-[28px]">
            <Checkbox
              label="Enable request caching"
              checked={cache()}
              onChange={changed(setCache)}
            />
          </FormRow>

          <FormRow label="Outputs" labelClass="min-h-[28px]">
            <CheckboxGroup
              options={outputOptions}
              value={enabledOutputs()}
              onChange={changed(setEnabledOutputs)}
            />
          </FormRow>

          <FormRow label="Radio" labelClass="min-h-[28px]">
            <Radio
              name="default-output"
              label="Default output"
              checked={defaultOutput()}
              onChange={() => changed(setDefaultOutput)(true)}
            />
          </FormRow>

          <FormRow label="Response" labelClass="min-h-[28px]">
            <RadioGroup
              name="response-mode"
              options={['Automatic', 'String', 'JSON'].map(value => ({ value, label: value }))}
              value={responseMode()}
              onChange={changed(setResponseMode)}
            />
          </FormRow>

          <FormRow label="Switch" labelClass="min-h-[28px]">
            <div class="space-y-3">
              <Switch label="Enable retry" checked={retry()} onChange={changed(setRetry)} />
              <Switch
                label="Follow redirects"
                checked={followRedirects()}
                onChange={changed(setFollowRedirects)}
              />
            </div>
          </FormRow>

          <FormRow label="Disabled" labelClass="min-h-[28px] text-(--fui-text-subtle)">
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Checkbox label="Checkbox" disabled />
              <Radio name="disabled-radio" label="Radio" disabled />
              <Switch label="Switch" disabled />
            </div>
          </FormRow>

          <div class="border-t border-(--fui-border-soft) pt-5">
            <h2 class="mb-5 text-[14px] font-semibold">Common Components</h2>
            <div class="space-y-5">
              <FormRow label="Field status">
                <div class="grid max-w-[520px] gap-2">
                  <TextInput value="Check this value" status="warning" />
                  <Select options={methods} value="GET" status="error" />
                </div>
              </FormRow>
              <FormRow label="Button">
                <div class="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="primary">Primary</Button>
                  <Button variant="danger">Delete</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </FormRow>
              <FormRow label="Icon Button">
                <div class="flex gap-1">
                  <IconButton label="Add">+</IconButton>
                  <IconButton label="Edit">✎</IconButton>
                  <IconButton label="More">⋯</IconButton>
                </div>
              </FormRow>
              <FormRow label="Editable List">
                <div class="w-full max-w-[680px] space-y-2">
                  <p class="m-0 text-[12px] text-(--fui-text-muted)">
                    Edit MQTT property mappings, add rows, remove rows, or drag the handle to
                    reorder.
                  </p>
                  <EditableList<EditableMapping>
                    items={mappings()}
                    sortable
                    addButton="Add mapping"
                    createItem={() => ({ property: '', payloadKey: '' })}
                    onChange={setMappings}
                    header={
                      <div class="grid grid-cols-2 gap-2 px-3 py-2">
                        <span>Device property</span>
                        <span>Payload JSON key</span>
                      </div>
                    }
                    renderItem={({ item, onChange }: EditableListItemProps<EditableMapping>) => (
                      <div class="grid grid-cols-2 gap-2">
                        <TextInput
                          value={item().property}
                          placeholder="e.g. temperature"
                          onInput={event =>
                            onChange({ ...item(), property: event.currentTarget.value })
                          }
                        />
                        <TextInput
                          value={item().payloadKey}
                          placeholder="e.g. sensor.temp"
                          onInput={event =>
                            onChange({ ...item(), payloadKey: event.currentTarget.value })
                          }
                        />
                      </div>
                    )}
                  />
                  <p class="m-0 text-[12px] text-(--fui-text-muted)">
                    {mappings().length} mapping{mappings().length === 1 ? '' : 's'}
                  </p>
                </div>
              </FormRow>
              <FormRow label="Code Editor">
                <div class="w-full max-w-[680px]">
                  <CodeEditor
                    language="javascript"
                    value={code()}
                    onChange={changed(setCode)}
                    height={220}
                  />
                </div>
              </FormRow>
              <FormRow label="Date & Time">
                <div class="grid max-w-[680px] gap-2 sm:grid-cols-3">
                  <DateTimePicker mode="date" value="2026-10-19" />
                  <DateTimePicker
                    mode="time"
                    value={runTime()}
                    onChange={value => changed(setRunTime)(String(value))}
                  />
                  <DateTimePicker
                    mode="datetime"
                    value={runAt()}
                    onChange={value => changed(setRunAt)(String(value))}
                  />
                </div>
              </FormRow>
              <FormRow label="Date Range">
                <div class="grid max-w-[680px] gap-2 sm:grid-cols-2">
                  <DateTimePicker
                    mode="date-range"
                    value={dateRange()}
                    onChange={changed(setDateRange)}
                  />
                  <DateTimePicker
                    mode="datetime-range"
                    value={scheduleRange()}
                    onChange={changed(setScheduleRange)}
                  />
                </div>
              </FormRow>
              <FormRow label="Range Input">
                <div class="max-w-[520px]">
                  <RangeInput
                    value={threshold()}
                    min={0}
                    max={100}
                    step={5}
                    unit="%"
                    onChange={changed(setThreshold)}
                  />
                </div>
              </FormRow>
              <FormRow label="Tooltip">
                <Tooltip content="Set a threshold from 0 to 100 percent." placement="top">
                  <Button variant="default">Hover or focus for help</Button>
                </Tooltip>
              </FormRow>
              <FormRow label="Popover">
                <Popover
                  trigger="Advanced details"
                  open={popoverOpen()}
                  onOpenChange={setPopoverOpen}
                >
                  <div class="w-64 space-y-2 text-[13px]">
                    <p class="m-0 font-semibold">Advanced settings</p>
                    <p class="m-0 text-(--fui-text-muted)">
                      This panel is positioned independently of the surrounding form overflow.
                    </p>
                    <Button onClick={() => setPopoverOpen(false)}>Close</Button>
                  </div>
                </Popover>
              </FormRow>
              <FormRow label="Icons">
                <div class="flex flex-wrap gap-3">
                  {iconNames.map(name => (
                    <span class="inline-flex items-center gap-1.5 rounded border border-(--fui-border-soft) px-2 py-1 text-[12px]">
                      <Icon name={name} class="size-4 text-(--fui-interactive)" />
                      {name}
                    </span>
                  ))}
                </div>
              </FormRow>
              <FormRow label="Textarea">
                <div class="w-full max-w-[520px]">
                  <Textarea
                    rows={4}
                    value="return msg.payload;"
                    description="JavaScript expression or template."
                  />
                </div>
              </FormRow>
              <FormRow label="Input Group">
                <div class="w-full max-w-[520px]">
                  <InputGroup prefix="msg." value="payload" />
                </div>
              </FormRow>
              <FormRow label="Tabs">
                <Tabs
                  defaultValue="general"
                  items={[
                    { id: 'general', label: 'General', content: 'General tab content' },
                    { id: 'security', label: 'Security', content: 'Security settings' },
                    { id: 'advanced', label: 'Advanced', content: 'Advanced options' },
                  ]}
                />
              </FormRow>
              <FormRow label="Collapse">
                <div class="w-full max-w-[620px]">
                  <Collapse title="Advanced settings" defaultOpen extra="Optional">
                    Advanced configuration can be placed here.
                  </Collapse>
                </div>
              </FormRow>
              <FormRow label="Alert">
                <div class="w-full max-w-[620px] space-y-2">
                  <Alert>This node will use the current flow context.</Alert>
                  <Alert status="warning">Changes require the flow to be redeployed.</Alert>
                  <Alert status="error">Unable to connect to the selected server.</Alert>
                </div>
              </FormRow>
              <FormRow label="Tag / Badge">
                <div class="flex items-center gap-2">
                  <Tag>string</Tag>
                  <Tag variant="info">connected</Tag>
                  <Tag variant="warning">modified</Tag>
                </div>
              </FormRow>
              <FormRow label="Loading">
                <Loading />
              </FormRow>
              <FormRow label="Overlay">
                <div class="flex gap-2">
                  <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
                  <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
                </div>
              </FormRow>
            </div>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-(--fui-border-soft) bg-(--fui-surface-soft) px-4 py-3">
          <span aria-live="polite" class="mr-auto text-[12px] text-(--fui-interactive)">
            {saved() ? 'Changes saved' : ''}
          </span>
          <button
            type="button"
            onClick={reset}
            class="h-(--fui-button-height) rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-4 text-[13px] hover:bg-(--fui-surface-hover)"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setSaved(true)}
            class="h-(--fui-button-height) rounded-(--fui-radius) border border-(--fui-accent-hover) bg-(--fui-accent) px-4 text-[13px] text-white hover:bg-(--fui-accent-hover)"
          >
            Done
          </button>
        </footer>
      </section>
      <Dialog
        open={dialogOpen()}
        title="Configure server"
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <div class="space-y-4">
          <FormRow label="Server">
            <TextInput value="localhost" />
          </FormRow>
          <FormRow label="Port">
            <InputNumber value={1880} min={1} max={65535} />
          </FormRow>
        </div>
      </Dialog>
      <Drawer
        open={drawerOpen()}
        title="Node configuration"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setDrawerOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <div class="space-y-4">
          <FormRow label="Name">
            <TextInput value="HTTP Request" />
          </FormRow>
          <FormRow label="URL">
            <TextInput value="https://example.com" />
          </FormRow>
          <FormRow label="Description">
            <Textarea rows={4} placeholder="Add a description" />
          </FormRow>
        </div>
      </Drawer>
    </main>
  )
}
