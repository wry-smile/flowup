import { useState } from 'preact/hooks'
import { PLUGIN_DISPLAY_NAME } from '../constant'
import { features, resourceUrl, tones } from '@client-shared/showcase'
import { t } from './i18n'

export default function App() {
  const [count, setCount] = useState(0)
  const [query, setQuery] = useState('')
  const filtered = features.filter(feature => feature.toLowerCase().includes(query.toLowerCase()))
  return <section class="grid gap-4 rounded-xl bg-violet-50 p-4 text-slate-900 dark:bg-slate-900 dark:text-white">
    <div class="flex items-center gap-3"><img class="h-9 w-9" src={resourceUrl('gallery-plugin', 'badge.svg')} alt="Gallery badge" /><h3 class="text-lg font-bold">{t('label.name') || PLUGIN_DISPLAY_NAME}</h3></div>
    <label class="grid gap-1 text-sm">Filter features<input class="rounded-md border border-violet-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-violet-500" type="search" value={query} onInput={event => setQuery(event.currentTarget.value)} /></label>
    <ul class="grid gap-2">{filtered.map(feature => <li key={feature} class="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-900">{feature}</li>)}</ul>
    <div class="flex flex-wrap gap-2">{tones.map(tone => <span key={tone.label} class={`rounded-full px-2 py-1 text-xs ring-1 ${tone.className}`}>{tone.label}</span>)}</div>
    <button class="rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-700" type="button" onClick={() => setCount(count + 1)}>Clicks: {count}</button>
  </section>
}
