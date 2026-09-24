import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import { getEditorI18nNamespace } from '../framework'
import { renderVueTypes } from '../framework-assets'
import appTemplate from '../../../files/node/client/vue/App.vue.eta?raw'
import dialogTemplate from '../../../files/node/client/vue/components/DialogRoot.vue.eta?raw'
import configurationTemplate from '../../../files/node/client/vue/components/ConfigurationPanel.vue.eta?raw'
import behaviorTemplate from '../../../files/node/client/vue/components/BehaviorPanel.vue.eta?raw'
import childValueTemplate from '../../../files/node/client/vue/components/ChildValue.vue.eta?raw'
import lifecycleTemplate from '../../../files/node/client/vue/components/LifecyclePanel.vue.eta?raw'
import integrationTemplate from '../../../files/node/client/vue/components/IntegrationPanel.vue.eta?raw'
import hydrateTemplate from '../../../files/node/client/vue/hydrate.ts.eta?raw'
import clientTemplate from '../../../files/node/client/vue/index.ts.eta?raw'

export function renderVueNodeFiles(
  ctx: TemplateContext,
  kind: 'node' | 'plugin' = 'node',
): FileMap {
  return {
    'client/App.vue': renderEta(appTemplate, { ctx }),
    'client/components/DialogRoot.vue': renderEta(dialogTemplate, { ctx }),
    'client/components/ConfigurationPanel.vue': renderEta(configurationTemplate, { ctx }),
    'client/components/BehaviorPanel.vue': renderEta(behaviorTemplate, { ctx }),
    'client/components/ChildValue.vue': renderEta(childValueTemplate, { ctx }),
    'client/components/LifecyclePanel.vue': renderEta(lifecycleTemplate, { ctx }),
    'client/components/IntegrationPanel.vue': renderEta(integrationTemplate, { ctx }),
    'client/hydrate.ts': renderEta(hydrateTemplate, {
      ctx,
      i18nNamespace: getEditorI18nNamespace(ctx, kind),
      i18nConstant: kind === 'node' ? 'NODE_NAME' : 'PLUGIN_NAME',
    }),
    'types/vue.d.ts': renderVueTypes(),
  }
}

export function renderVueNodeClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
