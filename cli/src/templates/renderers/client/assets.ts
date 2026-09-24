import type { FileMap, TemplateContext } from '../../../commands/gen/context'
import { renderEta } from '../eta'
import showcaseTemplate from '../../files/shared/client/showcase.ts.eta?raw'
import badgeTemplate from '../../files/shared/resources/badge.svg.eta?raw'
import iconTemplate from '../../files/shared/icons/icon.svg.eta?raw'

export function renderShowcaseAssets(ctx: TemplateContext): FileMap {
  const frameworkLabel = ctx.clientFramework[0].toUpperCase() + ctx.clientFramework.slice(1)
  const resourcePath = [`resources/flowup-${ctx.scope}`, ctx.resourceEntry]
    .filter(Boolean)
    .join('/')

  return {
    'client/showcase.ts': renderEta(showcaseTemplate, { resourcePath }),
    'icons/icon.svg': renderEta(iconTemplate, {
      label: frameworkLabel,
      initial: frameworkLabel[0] ?? 'F',
    }),
    'resources/badge.svg': renderEta(badgeTemplate, {
      label: frameworkLabel,
      initial: frameworkLabel[0] ?? 'F',
    }),
  }
}
