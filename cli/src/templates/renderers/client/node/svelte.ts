import type { FileMap, TemplateContext } from '../../../../commands/gen/context'
import { renderEta } from '../../eta'
import { getEditorI18nNamespace } from '../framework'
import { renderSvelteTypes } from '../framework-assets'
import appTemplate from '../../../files/node/client/svelte/App.svelte.eta?raw'
import dialogTemplate from '../../../files/node/client/svelte/components/DialogRoot.svelte.eta?raw'
import hydrateTemplate from '../../../files/node/client/svelte/hydrate.ts.eta?raw'
import portalTemplate from '../../../files/node/client/svelte/components/portal.ts.eta?raw'
import clientTemplate from '../../../files/node/client/svelte/index.ts.eta?raw'
import configurationTemplate from '../../../files/node/client/svelte/components/ConfigurationPanel.svelte.eta?raw'
import behaviorTemplate from '../../../files/node/client/svelte/components/BehaviorPanel.svelte.eta?raw'
import childValueTemplate from '../../../files/node/client/svelte/components/ChildValue.svelte.eta?raw'
import lifecycleTemplate from '../../../files/node/client/svelte/components/LifecyclePanel.svelte.eta?raw'
import integrationTemplate from '../../../files/node/client/svelte/components/IntegrationPanel.svelte.eta?raw'

export function renderSvelteNodeFiles(
  ctx: TemplateContext,
  kind: 'node' | 'plugin' = 'node',
): FileMap {
  return {
    'client/components/DialogRoot.svelte': renderEta(dialogTemplate, { ctx }),
    'client/components/ConfigurationPanel.svelte': renderEta(configurationTemplate, { ctx }),
    'client/components/BehaviorPanel.svelte': renderEta(behaviorTemplate, { ctx }),
    'client/components/ChildValue.svelte': renderEta(childValueTemplate, { ctx }),
    'client/components/LifecyclePanel.svelte': renderEta(lifecycleTemplate, { ctx }),
    'client/components/IntegrationPanel.svelte': renderEta(integrationTemplate, { ctx }),
    'client/components/portal.ts': renderEta(portalTemplate, { ctx }),
    'client/App.svelte': renderEta(appTemplate, { ctx }),
    'client/hydrate.ts': renderEta(hydrateTemplate, {
      ctx,
      i18nNamespace: getEditorI18nNamespace(ctx, kind),
      i18nConstant: kind === 'node' ? 'NODE_NAME' : 'PLUGIN_NAME',
    }),
    'types/svelte.d.ts': renderSvelteTypes(),
  }
}

export function renderSvelteNodeClient(ctx: TemplateContext): string {
  return renderEta(clientTemplate, { ctx })
}
