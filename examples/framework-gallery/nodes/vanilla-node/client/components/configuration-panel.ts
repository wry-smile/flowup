import type { FrameworkGalleryVanillaNodeProperties } from '../../types'

type State = Partial<FrameworkGalleryVanillaNodeProperties>

export function mountConfigurationPanel(
  root: HTMLElement,
  state: State,
  patch: (key: keyof FrameworkGalleryVanillaNodeProperties, value: unknown) => void,
): () => void {
  root.innerHTML = `
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
        <div>
          <h2 class="m-0 text-xs font-semibold">01 · Node Configuration</h2>
          <p class="mt-0.5 text-[10px] text-slate-500">Node-RED saves on Done and persists on Deploy</p>
        </div>
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
          ● persisted
        </span>
      </header>

      <div class="grid gap-3 p-3.5">
        <label>
          <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Name</span>
          <input
            id="node-input-name"
            class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Framework</span>
            <select
              id="node-input-framework"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
            >
              <option>Vue</option>
              <option>React</option>
              <option>Preact</option>
              <option>Solid</option>
              <option>Svelte</option>
            </select>
          </label>

          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Mode</span>
            <select
              id="node-input-mode"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
            >
              <option value="normal">Normal</option>
              <option value="compact">Compact</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>

        <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
          <span>
            <strong class="text-[11px] font-medium text-slate-900">Enabled</strong>
            <small class="text-[10px] text-slate-500">Persist boolean configuration</small>
          </span>
          <input id="node-input-enabled" type="checkbox" />
        </label>

        <div class="grid grid-cols-[1fr_1fr_auto] items-end gap-3 max-[480px]:grid-cols-2">
          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Price</span>
            <input
              id="node-input-price"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              type="number"
              min="0"
            />
          </label>

          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Quantity</span>
            <input
              id="node-input-quantity"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              type="number"
              min="0"
            />
          </label>

          <div class="min-w-20 rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">
            <small class="block text-[9px] font-medium uppercase tracking-wide text-indigo-500">Total</small>
            <strong data-total></strong>
          </div>
        </div>
      </div>
    </section>
  `
  const name = root.querySelector<HTMLInputElement>('#node-input-name')!
  const framework = root.querySelector<HTMLSelectElement>('#node-input-framework')!
  const mode = root.querySelector<HTMLSelectElement>('#node-input-mode')!
  const enabled = root.querySelector<HTMLInputElement>('#node-input-enabled')!
  const price = root.querySelector<HTMLInputElement>('#node-input-price')!
  const quantity = root.querySelector<HTMLInputElement>('#node-input-quantity')!
  const total = root.querySelector<HTMLElement>('[data-total]')!
  name.value = state.name ?? ''
  framework.value = state.framework ?? 'Vanilla'
  mode.value = state.mode ?? 'normal'
  enabled.checked = state.enabled !== false
  price.value = String(state.price ?? 12)
  quantity.value = String(state.quantity ?? 2)
  const updateTotal = () => {
    total.textContent = `$${(Number(price.value || 0) * Number(quantity.value || 0)).toFixed(2)}`
  }
  const listeners: Array<() => void> = []
  const bind = (element: HTMLElement, event: string, handler: EventListener) => {
    element.addEventListener(event, handler)
    listeners.push(() => element.removeEventListener(event, handler))
  }
  bind(name, 'input', () => {
    state.name = name.value
    patch('name', name.value)
  })
  bind(framework, 'change', () => {
    state.framework = framework.value
    patch('framework', framework.value)
  })
  bind(mode, 'change', () => {
    state.mode = mode.value
    patch('mode', mode.value)
  })
  bind(enabled, 'change', () => {
    state.enabled = enabled.checked
    patch('enabled', enabled.checked)
  })
  for (const input of [price, quantity])
    bind(input, 'input', () => {
      const key = input === price ? 'price' : 'quantity'
      const value = Number(input.value || 0)
      state[key] = value
      patch(key, value)
      updateTotal()
    })
  updateTotal()
  return () => {
    listeners.forEach(dispose => dispose())
  }
}
