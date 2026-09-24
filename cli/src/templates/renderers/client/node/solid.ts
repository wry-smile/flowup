import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import { getEditorI18nNamespace } from '../framework'
import appTemplate from '../../../files/node/client/solid/App.tsx.eta?raw'
import dialogTemplate from '../../../files/node/client/solid/components/DialogRoot.tsx.eta?raw'
import hydrateTemplate from '../../../files/node/client/solid/hydrate.ts.eta?raw'
import clientTemplate from '../../../files/node/client/solid/index.ts.eta?raw'
import configurationTemplate from '../../../files/node/client/solid/components/ConfigurationPanel.tsx.eta?raw'
import behaviorTemplate from '../../../files/node/client/solid/components/BehaviorPanel.tsx.eta?raw'
import childValueTemplate from '../../../files/node/client/solid/components/ChildValue.tsx.eta?raw'
import lifecycleTemplate from '../../../files/node/client/solid/components/LifecyclePanel.tsx.eta?raw'
import integrationTemplate from '../../../files/node/client/solid/components/IntegrationPanel.tsx.eta?raw'

export function renderSolidNodeFiles(
  ctx: TemplateContext,
  kind: 'node' | 'plugin' = 'node',
): FileMap {
  return {
    'client/App.tsx': renderEta(appTemplate, { ctx }),
    'client/components/DialogRoot.tsx': renderEta(dialogTemplate, { ctx }),
    'client/components/ConfigurationPanel.tsx': renderEta(configurationTemplate, { ctx }),
    'client/components/BehaviorPanel.tsx': renderEta(behaviorTemplate, { ctx }),
    'client/components/ChildValue.tsx': renderEta(childValueTemplate, { ctx }),
    'client/components/LifecyclePanel.tsx': renderEta(lifecycleTemplate, { ctx }),
    'client/components/IntegrationPanel.tsx': renderEta(integrationTemplate, { ctx }),
    'client/hydrate.ts': renderEta(hydrateTemplate, {
      ctx,
      i18nNamespace: getEditorI18nNamespace(ctx, kind),
      i18nConstant: kind === 'node' ? 'NODE_NAME' : 'PLUGIN_NAME',
    }),
  }
}

export function renderSolidNodeClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
