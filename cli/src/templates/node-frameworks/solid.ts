import type { FileMap, TemplateContext } from '../../commands/gen/context'

export function renderSolidNodeFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.tsx': `import { createSignal } from 'solid-js'
import { NODE_NAME } from '../constant'
import { store } from './hydrate'
import { t } from './i18n'

export default function App() {
  const [name, setName] = createSignal(store.getSnapshot().name ?? '')

  return <div class="flowup-panel${ctx.unocss ? ' rounded-lg border border-slate-200 p-4 shadow-sm' : ''}">
    <label for="node-input-name">{t('label.name')}</label>
    <input id="node-input-name" value={name()} onInput={event => {
      const value = event.currentTarget.value
      setName(value)
      store.patch('name', value || undefined)
    }} />
    <p>Solid editor for {NODE_NAME}</p>
  </div>
}
`,
    'client/hydrate.ts': `import { createHydrateStore } from '@wry-smile/flowup/client'
import type { ${ctx.properName}Properties } from '../types'

export const store = createHydrateStore<${ctx.properName}Properties>({ name: undefined })
`,
  }
}

export function renderSolidNodeClient(ctx: TemplateContext): string {
  return `import type { EditorRED } from 'node-red'
import type { ${ctx.properName}ClientNodeProperties } from '../types'
import { render } from 'solid-js/web'
${ctx.unocss ? "import 'virtual:uno.css'\n" : ''}import App from './App'
import { store } from './hydrate'
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from '../constant'

declare const RED: EditorRED

let dispose: (() => void) | undefined
function destroyApp() { dispose?.(); dispose = undefined }

RED.nodes.registerType<${ctx.properName}ClientNodeProperties>(NODE_NAME, {
  category: 'function',
  color: '#a6bbcf',
  defaults: { name: { value: '' } },
  inputs: 1,
  outputs: 1,
  paletteLabel: NODE_PALETTE_LABEL,
  label() { return this.name || NODE_NAME },
  oneditprepare() {
    store.hydrate(this)
    destroyApp()
    const target = document.querySelector(\`[data-flowup-scope="\${NODE_SCOPE}"].flowup-solid-root\`)
    if (target) dispose = render(() => App(), target)
  },
  oneditsave() { store.commit(this); destroyApp() },
  oneditcancel() { destroyApp() },
})
`
}
