import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import clientTemplate from '../../../files/plugin/client/preact/index.ts.eta?raw'
import { renderPreactNodeFiles } from '../node/preact'

export function renderPreactPluginFiles(ctx: TemplateContext): FileMap {
  return renderPreactNodeFiles(ctx, 'plugin')
}

export function renderPreactPluginClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
