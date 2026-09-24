import { createGenerator } from '@unocss/core'
import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderEta } from './eta'
import pluginTypesTemplate from '../files/plugin/types/index.ts.eta?raw'
import pluginRuntimeTemplate from '../files/plugin/runtime/index.ts.eta?raw'
import pluginConstantsTemplate from '../files/plugin/constant/index.ts.eta?raw'
import pluginPackageTemplate from '../files/plugin/package.json.eta?raw'
import pluginViteConfigTemplate from '../files/plugin/flowup.config.ts.eta?raw'
import gitignoreTemplate from '../files/shared/gitignore.eta?raw'
import gitkeepTemplate from '../files/shared/gitkeep.eta?raw'
import iconsReadmeTemplate from '../files/shared/icons/README.md.eta?raw'
import resourcesReadmeTemplate from '../files/shared/resources/README.md.eta?raw'
import tsconfigRootTemplate from '../files/shared/tsconfig-root.json.eta?raw'
import tsconfigAppTemplate from '../files/shared/tsconfig-app.json.eta?raw'
import tsconfigNodeTemplate from '../files/shared/tsconfig-node.json.eta?raw'
import globalsTemplate from '../files/shared/types/globals.d.ts.eta?raw'
import editorTemplate from '../files/shared/client/editor.html.eta?raw'
import localeTemplate from '../files/shared/locales/plugin.json.eta?raw'
import readmeTemplate from '../files/plugin/README.md.eta?raw'
import {
  getFrameworkDevDependencies,
  getClientEntryPath,
  isPreactFramework,
  isSolidFramework,
  isSvelteFramework,
  isVueFramework,
} from './client/framework'
import { getBaseTemplateDevDependencies } from './dependency-versions'
import { renderMitLicense } from './license'
import { renderShowcaseAssets } from './client/assets'
import { renderSveltePluginClient, renderSveltePluginFiles } from './client/plugin/svelte'
import { renderPreactPluginClient, renderPreactPluginFiles } from './client/plugin/preact'
import { renderSolidPluginClient, renderSolidPluginFiles } from './client/plugin/solid'
import { renderVuePluginClient, renderVuePluginFiles } from './client/plugin/vue'
import { renderVanillaPluginClient, renderVanillaPluginFiles } from './client/plugin/vanilla'
import { presetFlowupWind4 } from '../../sdk/preset-flowup-unocss-wind4'

export async function pluginTemplate(ctx: TemplateContext): Promise<FileMap> {
  const files: FileMap = {
    '.gitignore': renderEta(gitignoreTemplate, {}),
    'package.json': renderPackageJson(ctx),
    LICENSE: renderMitLicense(),
    'flowup.config.ts': renderViteConfig(ctx),
    'tsconfig.json': renderTsconfigRoot(),
    'tsconfig.app.json': renderTsconfigApp(ctx),
    'tsconfig.node.json': renderTsconfigNode(),
    'constant/index.ts': renderConstants(ctx),
    'types/index.ts': renderTypes(ctx),
    'runtime/index.ts': renderRuntime(ctx),
    [getClientEntryPath(ctx)]: renderClientEntry(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    ...renderFrameworkFiles(ctx),
    'types/globals.d.ts': renderClientGlobals(),
    'icons/.gitkeep': renderGitkeep('Palette icons for the plugin UI.'),
    'icons/README.md': renderIconsReadme(),
    'resources/.gitkeep': renderGitkeep(
      'Static resources served by Node-RED editor at /resources/<module>/<file>.',
    ),
    'resources/README.md': renderResourcesReadme(),
    ...renderShowcaseAssets(ctx),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson(ctx, locale)
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }

  if (!ctx.unocss) {
    const uno = await createGenerator({ presets: [presetFlowupWind4({ scope: ctx.scope })] })
    const source = Object.entries(files)
      .filter(([path]) => path.startsWith('client/') && !path.endsWith('.css'))
      .map(([, content]) => content)
      .join('\n')
    const generated = await uno.generate(source)
    files['client/config-panel.css'] = generated.css
  }

  return files
}

function renderGitkeep(hint: string): string {
  return renderEta(gitkeepTemplate, { hint })
}

function renderIconsReadme(): string {
  return renderEta(iconsReadmeTemplate, { plugin: true })
}

function renderResourcesReadme(): string {
  return renderEta(resourcesReadmeTemplate, {})
}

function renderPackageJson(ctx: TemplateContext): string {
  const devDependencies = [
    ...getBaseTemplateDevDependencies(ctx.flowupSpecifier),
    ...getFrameworkDevDependencies(ctx),
  ].join(',\n')

  return renderEta(pluginPackageTemplate, { ctx, dependencies: devDependencies })
}

function renderViteConfig(ctx: TemplateContext): string {
  return renderEta(pluginViteConfigTemplate, { ctx })
}

function renderTsconfigRoot(): string {
  return renderEta(tsconfigRootTemplate, {})
}

function renderTsconfigApp(ctx: TemplateContext): string {
  return renderEta(tsconfigAppTemplate, {
    jsx: isPreactFramework(ctx) || isSolidFramework(ctx),
    jsxImportSource: isPreactFramework(ctx) ? 'preact' : isSolidFramework(ctx) ? 'solid-js' : '',
  })
}

function renderTsconfigNode(): string {
  return renderEta(tsconfigNodeTemplate, {})
}

function renderConstants(ctx: TemplateContext): string {
  return renderEta(pluginConstantsTemplate, { ctx })
}

function renderTypes(ctx: TemplateContext): string {
  return renderEta(pluginTypesTemplate, { ctx })
}

function renderRuntime(ctx: TemplateContext): string {
  return renderEta(pluginRuntimeTemplate, { ctx })
}

function renderClientEntry(ctx: TemplateContext): string {
  if (isVueFramework(ctx)) return renderVuePluginClient(ctx)
  if (isSvelteFramework(ctx)) return renderSveltePluginClient(ctx)
  if (isPreactFramework(ctx)) return renderPreactPluginClient(ctx)
  if (isSolidFramework(ctx)) return renderSolidPluginClient(ctx)

  return renderVanillaPluginClient(ctx)
}

function renderEditorHtml(ctx: TemplateContext): string {
  return renderEta(editorTemplate, { ctx, kind: 'plugin' })
}

function renderFrameworkFiles(ctx: TemplateContext): FileMap {
  if (isVueFramework(ctx)) return renderVuePluginFiles(ctx)
  if (isSvelteFramework(ctx)) return renderSveltePluginFiles(ctx)
  if (isPreactFramework(ctx)) return renderPreactPluginFiles(ctx)
  if (isSolidFramework(ctx)) return renderSolidPluginFiles(ctx)
  return renderVanillaPluginFiles(ctx)
}

function renderClientGlobals(): string {
  return renderEta(globalsTemplate, {})
}

function renderLocaleJson(ctx: TemplateContext, locale: string): string {
  return renderEta(localeTemplate, { name: ctx.name, chinese: locale === 'zh-CN' })
}

function renderReadme(ctx: TemplateContext): string {
  return renderEta(readmeTemplate, { ctx })
}
