import type { TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import clientTemplate from '../../../files/plugin/client/vanilla/index.ts.eta?raw'
import { renderVanillaNodeFiles } from '../node/vanilla'

export function renderVanillaPluginFiles(ctx: TemplateContext) {
  return renderVanillaNodeFiles(ctx, 'plugin')
}

export function renderVanillaPluginClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx, unocss: ctx.unocss })
}
