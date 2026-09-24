import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import clientTemplate from '../../../files/plugin/client/solid/index.ts.eta?raw'
import { renderSolidNodeFiles } from '../node/solid'

export function renderSolidPluginFiles(ctx: TemplateContext): FileMap {
  return renderSolidNodeFiles(ctx, 'plugin')
}

export function renderSolidPluginClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
