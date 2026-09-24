import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import { getEditorI18nNamespace } from '../framework'
import clientTemplate from '../../../files/node/client/vanilla/index.ts.eta?raw'
import hydrateTemplate from '../../../files/node/client/vanilla/hydrate.ts.eta?raw'
import mountPanelTemplate from '../../../files/node/client/vanilla/components/mount-config-panel.ts.eta?raw'
import configurationPanelTemplate from '../../../files/node/client/vanilla/components/configuration-panel.ts.eta?raw'
import behaviorPanelTemplate from '../../../files/node/client/vanilla/components/behavior-panel.ts.eta?raw'
import lifecyclePanelTemplate from '../../../files/node/client/vanilla/components/lifecycle-panel.ts.eta?raw'
import integrationPanelTemplate from '../../../files/node/client/vanilla/components/integration-panel.ts.eta?raw'

export function renderVanillaNodeFiles(
  ctx: TemplateContext,
  kind: 'node' | 'plugin' = 'node',
): FileMap {
  return {
    'client/hydrate.ts': renderEta(hydrateTemplate, {
      ctx,
      i18nNamespace: getEditorI18nNamespace(ctx, kind),
      i18nConstant: kind === 'node' ? 'NODE_NAME' : 'PLUGIN_NAME',
    }),
    'client/components/mount-config-panel.ts': renderEta(mountPanelTemplate, { ctx }),
    'client/components/configuration-panel.ts': renderEta(configurationPanelTemplate, { ctx }),
    'client/components/behavior-panel.ts': renderEta(behaviorPanelTemplate, { ctx }),
    'client/components/lifecycle-panel.ts': renderEta(lifecyclePanelTemplate, { ctx }),
    'client/components/integration-panel.ts': renderEta(integrationPanelTemplate, { ctx }),
  }
}

export function renderVanillaNodeClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
