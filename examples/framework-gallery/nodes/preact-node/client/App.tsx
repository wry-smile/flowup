import { useState } from 'preact/hooks'
import { features, resourceUrl, tones } from '@client-shared/showcase'
import { store } from './hydrate'
import { t } from './i18n'

export default function App() {
  const [name, setName] = useState(store.getSnapshot().name ?? '')
  const [selected, setSelected] = useState(0)
  const [expanded, setExpanded] = useState(false)

  return (
    <section class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div class="flex items-center gap-3">
        <img
          class="h-10 w-10 rounded-lg"
          src={resourceUrl('preact-node', 'badge.svg')}
          alt="Preact badge"
        />
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Preact editor</h3>
          <p class="text-xs text-slate-500">Hooks and scoped UnoCSS</p>
        </div>
      </div>
      <label
        class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200"
        htmlFor="node-input-name"
      >
        {t('label.name')}
        <input
          class="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
          id="node-input-name"
          value={name}
          onInput={event => {
            const value = event.currentTarget.value
            setName(value)
            store.patch('name', value || undefined)
          }}
        />
      </label>
      <div class="flex flex-wrap gap-2" role="group" aria-label="Color tone">
        {tones.map((tone, index) => (
          <button
            key={tone.label}
            type="button"
            class={`rounded-full px-3 py-1 text-sm ring-1 transition hover:scale-105 ${tone.className} ${selected === index ? 'ring-2' : ''}`}
            onClick={() => setSelected(index)}
          >
            {tone.label}
          </button>
        ))}
      </div>
      <button
        class="w-fit rounded-lg bg-sky-600 px-3 py-2 text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        Features {expanded ? '−' : '+'}
      </button>
      {expanded && (
        <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
          {features.map(feature => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
