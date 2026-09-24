import { For, Show, createSignal } from 'solid-js'
import { Portal } from 'solid-js/web'
import { features, resourceUrl, tones } from '@client-shared/showcase'
import { store } from './hydrate'
import { t } from './i18n'

export default function App() {
  const [name, setName] = createSignal(store.getSnapshot().name ?? '')
  const [selected, setSelected] = createSignal(0)
  const [helpOpen, setHelpOpen] = createSignal(false)

  return (
    <section class="grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
      <div class="flex items-center gap-3 sm:col-span-2">
        <img
          class="h-10 w-10 rounded-full"
          src={resourceUrl('solid-node', 'badge.svg')}
          alt="Solid badge"
        />
        <h3 class="text-lg font-bold text-amber-900 dark:text-amber-100">Solid editor</h3>
      </div>
      <label class="grid gap-1 text-sm font-semibold" for="node-input-name">
        {t('label.name')}
        <input
          class="rounded-md border border-amber-300 bg-white px-3 py-2 focus:ring-2 focus:ring-amber-400"
          id="node-input-name"
          value={name()}
          onInput={event => {
            const value = event.currentTarget.value
            setName(value)
            store.patch('name', value || undefined)
          }}
        />
      </label>
      <div class="grid gap-1 text-sm">
        <span>Preview</span>
        <output class="truncate rounded-md bg-white p-2 text-amber-900">
          {name() || 'Unnamed node'}
        </output>
      </div>
      <div class="flex flex-wrap gap-2 sm:col-span-2">
        <For each={tones}>
          {(tone, index) => (
            <button
              type="button"
              class={`rounded-full px-3 py-1 ring-1 hover:opacity-80 ${tone.className}`}
              aria-pressed={selected() === index()}
              onClick={() => setSelected(index())}
            >
              {tone.label}
            </button>
          )}
        </For>
      </div>
      <button
        class="rounded-lg bg-amber-600 px-3 py-2 text-white hover:bg-amber-700"
        type="button"
        onClick={() => setHelpOpen(true)}
      >
        Open scoped overlay
      </button>
      <Show when={helpOpen()}>
        <Portal>
          <div
            data-flowup-scope="framework-gallery"
            class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Solid features"
          >
            <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <h4 class="text-lg font-bold">Solid features</h4>
              <ul class="mt-3 list-disc pl-5 text-sm">
                <For each={features}>{feature => <li>{feature}</li>}</For>
              </ul>
              <button
                class="mt-4 rounded bg-amber-600 px-3 py-2 text-white"
                type="button"
                onClick={() => setHelpOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Portal>
      </Show>
    </section>
  )
}
