import type { FrameworkGalleryPreactNodeProperties } from '../../types'
import { $t } from '../hydrate'

interface Props {
  state: FrameworkGalleryPreactNodeProperties
  onPatch: <K extends keyof FrameworkGalleryPreactNodeProperties>(
    key: K,
    value: FrameworkGalleryPreactNodeProperties[K],
  ) => void
}

export default function ConfigurationPanel({ state, onPatch }: Props) {
  const total = Number(state.price || 0) * Number(state.quantity || 0)
  return (
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
        <div>
          <h2 class="m-0 text-xs font-semibold">01 · {$t('panel.configuration')}</h2>
          <p class="mt-0.5 text-[10px] text-slate-500">{$t('panel.savedOnDone')}</p>
        </div>
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
          ● {$t('panel.persisted')}
        </span>
      </header>
      <div class="grid gap-3 p-3.5">
        <label>
          <span class="mb-1.5 block text-[11px] font-medium text-slate-500">{$t('label.name')}</span>
          <input
            id="node-input-name"
            class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
            value={state.name || ''}
            onInput={event => onPatch('name', event.currentTarget.value)}
          />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Framework</span>
            <select
              id="node-input-framework"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              value={state.framework}
              onChange={event => onPatch('framework', event.currentTarget.value)}
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
              value={state.mode}
              onChange={event => onPatch('mode', event.currentTarget.value)}
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
          <input
            id="node-input-enabled"
            type="checkbox"
            checked={state.enabled}
            onChange={event => onPatch('enabled', event.currentTarget.checked)}
          />
        </label>
        <div class="grid grid-cols-[1fr_1fr_auto] items-end gap-3 max-[480px]:grid-cols-2">
          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Price</span>
            <input
              id="node-input-price"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              type="number"
              min="0"
              value={state.price}
              onInput={event => onPatch('price', Number(event.currentTarget.value || 0))}
            />
          </label>
          <label>
            <span class="mb-1.5 block text-[11px] font-medium text-slate-500">Quantity</span>
            <input
              id="node-input-quantity"
              class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 transition outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
              type="number"
              min="0"
              value={state.quantity}
              onInput={event => onPatch('quantity', Number(event.currentTarget.value || 0))}
            />
          </label>
          <div class="min-w-20 rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">
            <small class="block text-[9px] font-medium tracking-wide text-indigo-500 uppercase">
              Total
            </small>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}
