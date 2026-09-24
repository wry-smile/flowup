import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import clientTemplate from '../../../files/plugin/client/vue/index.ts.eta?raw'
import { renderVueNodeFiles } from '../node/vue'

export function renderVuePluginFiles(ctx: TemplateContext): FileMap {
  return renderVueNodeFiles(ctx, 'plugin')
}

export function renderVuePluginClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
