import type { FrameworkGalleryVanillaNodeProperties } from '../../types'
import { mountBehaviorPanel } from './behavior-panel'
import { mountConfigurationPanel } from './configuration-panel'
import { mountIntegrationPanel } from './integration-panel'
import { mountLifecyclePanel } from './lifecycle-panel'

type State = Partial<FrameworkGalleryVanillaNodeProperties>

export function mountConfigPanel(
  root: HTMLElement,
  state: State,
  patch: (key: keyof FrameworkGalleryVanillaNodeProperties, value: unknown) => void,
): () => void {
  root.classList.add('grid', 'gap-3', 'bg-slate-50', 'p-3')
  root.innerHTML = `<div data-flowup-section="configuration"></div><div data-flowup-section="behavior"></div><div data-flowup-section="lifecycle"></div><div data-flowup-section="integration"></div><details class="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white"><summary>State inspector <span>Node-RED editor draft</span></summary><p class="mt-0.5 text-[10px] text-slate-500">Done writes these values to the flow draft. Deploy persists the flow.</p><pre data-editor-state></pre></details>`
  const stateOutput = root.querySelector<HTMLElement>('[data-editor-state]')!
  const renderState = () => {
    stateOutput.textContent = JSON.stringify(state, null, 2)
  }
  const patchAndRender = (key: keyof FrameworkGalleryVanillaNodeProperties, value: unknown) => {
    ;(state as Record<string, unknown>)[String(key)] = value
    patch(key, value)
    renderState()
  }
  renderState()
  const disposers = [
    mountConfigurationPanel(
      root.querySelector('[data-flowup-section="configuration"]')!,
      state,
      patchAndRender,
    ),
    mountBehaviorPanel(
      root.querySelector('[data-flowup-section="behavior"]')!,
      state,
      patchAndRender,
    ),
    mountLifecyclePanel(root.querySelector('[data-flowup-section="lifecycle"]')!),
    mountIntegrationPanel(root.querySelector('[data-flowup-section="integration"]')!),
  ]
  return () => {
    for (const dispose of disposers.reverse()) dispose()
    root.replaceChildren()
  }
}
