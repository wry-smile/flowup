import type { FileMap, TemplateContext } from '../../commands/gen/context'

export function renderSolidPluginFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.tsx': `import { createSignal } from 'solid-js'
import { PLUGIN_DISPLAY_NAME } from '../constant'
import { t } from './i18n'

export default function App() {
  const [count, setCount] = createSignal(0)
  return <section class="flowup-plugin-panel${ctx.unocss ? ' rounded-lg bg-slate-50 p-4 text-slate-900' : ''}">
    <h3>{t('label.title') || PLUGIN_DISPLAY_NAME}</h3>
    <button type="button" onClick={() => setCount(count() + 1)}>Clicks: {count()}</button>
  </section>
}
`,
  }
}

export function renderSolidPluginClient(ctx: TemplateContext): string {
  return `import type { EditorRED } from 'node-red'
import { render } from 'solid-js/web'
${ctx.unocss ? "import 'virtual:uno.css'\n" : ''}import App from './App'
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME, PLUGIN_SCOPE } from '../constant'

declare const RED: EditorRED

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
    if (RED.sidebar.containsTab(PLUGIN_NAME)) return
    const target = document.createElement('div')
    target.dataset.flowupScope = PLUGIN_SCOPE
    target.className = 'flowup-solid-root'
    RED.sidebar.addTab({
      id: PLUGIN_NAME,
      name: PLUGIN_DISPLAY_NAME,
      label: PLUGIN_DISPLAY_NAME,
      iconClass: 'fa fa-puzzle-piece',
      content: target,
    })
    render(() => <App />, target)
  },
})
`
}
