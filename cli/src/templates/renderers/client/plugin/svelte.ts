import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import clientTemplate from '../../../files/plugin/client/svelte/index.ts.eta?raw'
import { renderSvelteNodeFiles } from '../node/svelte'

export function renderSveltePluginFiles(ctx: TemplateContext): FileMap {
  return renderSvelteNodeFiles(ctx, 'plugin')
}

export function renderSveltePluginClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
