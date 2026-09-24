import { createGenerator } from '@unocss/core'
import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderEta } from './eta'
import nodeTypesTemplate from '../files/node/types/index.ts.eta?raw'
import nodeRuntimeTemplate from '../files/node/runtime/index.ts.eta?raw'
import nodeConstantsTemplate from '../files/node/constant/index.ts.eta?raw'
import nodePackageTemplate from '../files/node/package.json.eta?raw'
import nodeViteConfigTemplate from '../files/node/flowup.config.ts.eta?raw'
import gitignoreTemplate from '../files/shared/gitignore.eta?raw'
import gitkeepTemplate from '../files/shared/gitkeep.eta?raw'
import iconsReadmeTemplate from '../files/shared/icons/README.md.eta?raw'
import resourcesReadmeTemplate from '../files/shared/resources/README.md.eta?raw'
import tsconfigRootTemplate from '../files/shared/tsconfig-root.json.eta?raw'
import tsconfigAppTemplate from '../files/shared/tsconfig-app.json.eta?raw'
import tsconfigNodeTemplate from '../files/shared/tsconfig-node.json.eta?raw'
import globalsTemplate from '../files/shared/types/globals.d.ts.eta?raw'
import editorTemplate from '../files/shared/client/editor.html.eta?raw'
import helpTemplate from '../files/shared/locales/help.html.eta?raw'
import localeTemplate from '../files/shared/locales/node.json.eta?raw'
import readmeTemplate from '../files/node/README.md.eta?raw'
import {
  getFrameworkDevDependencies,
  getClientEntryPath,
  isPreactFramework,
  isSolidFramework,
  isSvelteFramework,
  isVueFramework,
  renderFrameworkEditorContent,
} from './client/framework'
import { getBaseTemplateDevDependencies } from './dependency-versions'
import { renderMitLicense } from './license'
import { renderShowcaseAssets } from './client/assets'
import { renderSvelteNodeClient, renderSvelteNodeFiles } from './client/node/svelte'
import { renderPreactNodeClient, renderPreactNodeFiles } from './client/node/preact'
import { renderSolidNodeClient, renderSolidNodeFiles } from './client/node/solid'
import { renderVanillaNodeClient, renderVanillaNodeFiles } from './client/node/vanilla'
import { renderVueNodeClient, renderVueNodeFiles } from './client/node/vue'
import { presetFlowupWind4 } from '../../sdk/preset-flowup-unocss-wind4'

export async function nodeTemplate(ctx: TemplateContext): Promise<FileMap> {
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
    'types/globals.d.ts': renderClientGlobals(),
    ...renderFrameworkFiles(ctx),
    'icons/.gitkeep': renderGitkeep('Palette icons referenced by client/index.ts -> icon.'),
    'icons/README.md': renderIconsReadme(),
    'resources/.gitkeep': renderGitkeep(
      'Static resources served by Node-RED editor at /resources/<module>/<file>.',
    ),
    'resources/README.md': renderResourcesReadme(),
    ...renderShowcaseAssets(ctx),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.html`] = renderLocaleHelpHtml(ctx)
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

function renderPackageJson(ctx: TemplateContext): string {
  const devDependencies = [
    ...getBaseTemplateDevDependencies(ctx.flowupSpecifier),
    ...getFrameworkDevDependencies(ctx),
  ].join(',\n')

  return renderEta(nodePackageTemplate, { ctx, dependencies: devDependencies })
}

function renderGitkeep(hint: string): string {
  return renderEta(gitkeepTemplate, { hint })
}

function renderIconsReadme(): string {
  return renderEta(iconsReadmeTemplate, { plugin: false })
}

function renderResourcesReadme(): string {
  return renderEta(resourcesReadmeTemplate, {})
}

function renderViteConfig(ctx: TemplateContext): string {
  return renderEta(nodeViteConfigTemplate, { ctx })
}

function renderTsconfigRoot(): string {
  return renderEta(tsconfigRootTemplate, {})
}

function renderTsconfigApp(ctx: TemplateContext): string {
  const hasFramework =
    isVueFramework(ctx) || isSvelteFramework(ctx) || isPreactFramework(ctx) || isSolidFramework(ctx)
  return renderEta(tsconfigAppTemplate, {
    jsx: hasFramework,
    jsxImportSource: isPreactFramework(ctx) ? 'preact' : isSolidFramework(ctx) ? 'solid-js' : '',
  })
}

function renderTsconfigNode(): string {
  return renderEta(tsconfigNodeTemplate, {})
}

function renderConstants(ctx: TemplateContext): string {
  return renderEta(nodeConstantsTemplate, { ctx })
}

function renderTypes(ctx: TemplateContext): string {
  return renderEta(nodeTypesTemplate, { ctx })
}

function renderRuntime(ctx: TemplateContext): string {
  return renderEta(nodeRuntimeTemplate, { ctx })
}

function renderClientEntry(ctx: TemplateContext): string {
  if (isVueFramework(ctx)) return renderVueNodeClient(ctx)

  if (isSvelteFramework(ctx)) return renderSvelteNodeClient(ctx)

  if (isPreactFramework(ctx)) return renderPreactNodeClient(ctx)

  if (isSolidFramework(ctx)) return renderSolidNodeClient(ctx)

  return renderVanillaNodeClient(ctx)
}

function renderFrameworkFiles(ctx: TemplateContext): FileMap {
  if (isVueFramework(ctx)) return renderVueNodeFiles(ctx)

  if (isSvelteFramework(ctx)) return renderSvelteNodeFiles(ctx)

  if (isPreactFramework(ctx)) return renderPreactNodeFiles(ctx)

  if (isSolidFramework(ctx)) return renderSolidNodeFiles(ctx)

  return renderVanillaNodeFiles(ctx)
}

function renderClientGlobals(): string {
  return renderEta(globalsTemplate, {})
}

function renderEditorHtml(ctx: TemplateContext): string {
  const content = renderFrameworkEditorContent(ctx)

  return renderEta(editorTemplate, { ctx, kind: 'node', content })
}

function renderLocaleHelpHtml(ctx: TemplateContext): string {
  return renderEta(helpTemplate, { name: ctx.name })
}

function renderLocaleJson(ctx: TemplateContext, locale: string): string {
  return renderEta(localeTemplate, { name: ctx.name, chinese: locale === 'zh-CN' })
}

function renderReadme(ctx: TemplateContext): string {
  return renderEta(readmeTemplate, { ctx })
}
