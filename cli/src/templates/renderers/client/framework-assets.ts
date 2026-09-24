import { renderEta } from '../eta'
import vueTypesTemplate from '../../files/shared/types/vue.d.ts.eta?raw'
import svelteTypesTemplate from '../../files/shared/types/svelte.d.ts.eta?raw'

export function renderVueTypes(): string {
  return renderEta(vueTypesTemplate, {})
}

export function renderSvelteTypes(): string {
  return renderEta(svelteTypesTemplate, {})
}
