import type { FileMap, TemplateContext } from '../commands/gen/context'
import {
  getFrameworkDevDependencies,
  getFrameworkVitePluginSetup,
  getClientEntryPath,
  renderFrameworkI18n,
  isPreactFramework,
  isSolidFramework,
  isSvelteFramework,
  isVueFramework,
  renderFrameworkReadmeLines,
} from './client-framework'
import { getBaseTemplateDevDependencies } from './dependency-versions'
import { renderMitLicense } from './license'
import { renderSveltePluginClient, renderSveltePluginFiles } from './plugin-frameworks/svelte'
import { renderPreactPluginClient, renderPreactPluginFiles } from './plugin-frameworks/preact'
import { renderSolidPluginClient, renderSolidPluginFiles } from './plugin-frameworks/solid'
import { renderVuePluginClient, renderVuePluginFiles } from './plugin-frameworks/vue'

export function pluginTemplate(ctx: TemplateContext): FileMap {
  return {
    '.gitignore': renderGitignore(),
    'package.json': renderPackageJson(ctx),
    LICENSE: renderMitLicense(),
    'flowup.config.ts': renderViteConfig(ctx),
    'tsconfig.json': renderTsconfigRoot(),
    'tsconfig.app.json': renderTsconfigApp(ctx),
    'tsconfig.node.json': renderTsconfigNode(),
    'constant/index.ts': renderConstants(ctx),
    'types/index.ts': renderTypes(ctx),
    'runtime/index.ts': renderRuntime(),
    [getClientEntryPath(ctx)]: renderClientEntry(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    ...(ctx.clientFramework !== 'vanilla'
      ? { 'client/i18n.ts': renderFrameworkI18n(ctx, 'plugin') }
      : {}),
    ...renderFrameworkFiles(ctx),
    'types/globals.d.ts': renderClientGlobals(),
    'icons/.gitkeep': renderGitkeep('Palette icons for the plugin UI.'),
    'icons/README.md': renderIconsReadme(),
    'resources/.gitkeep': renderGitkeep(
      'Static resources served by Node-RED editor at /resources/<module>/<file>.',
    ),
    'resources/README.md': renderResourcesReadme(),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson(ctx, locale)
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }
}

function renderGitignore(): string {
  return `node_modules/
dist/
.flowup/
`
}

function renderGitkeep(hint: string): string {
  return `# ${hint}\n# Drop your files into this directory and re-run \`flowup build\`.\n`
}

function renderIconsReadme(): string {
  return `# icons

Palette icons for this plugin. flowup build copies this directory into
\`dist/icons/\` automatically.

Reference icons from \`client/index.ts\` using the icon filename only.
`
}

function renderResourcesReadme(): string {
  return `# resources

Node-RED (since 1.3) serves any file in this directory under
\`/resources/<module-name>/<file>\` so the editor can load it.

For a scoped module (\`@scope/foo\`), the path becomes
\`/resources/@scope/foo/<file>\`.

Reference resources from your plugin client or \`client/editor.html\` with
**relative** URLs (no leading \`/\`):

\`\`\`html
<img src="resources/<module-name>/banner.png" />
<script src="resources/<module-name>/library.js"></script>
\`\`\`

See https://nodered.org/docs/creating-nodes/resources
`
}

function renderPackageJson(ctx: TemplateContext): string {
  const devDependencies = [
    ...getBaseTemplateDevDependencies(ctx.flowupSpecifier),
    ...getFrameworkDevDependencies(ctx),
  ].join(',\n')

  return `{
  "name": "flowup-${ctx.name}",
  "type": "module",
  "version": "1.0.0",
  "description": "A Node-RED editor plugin built with Flowup.",
  "license": "MIT",
  "keywords": [
    "node-red",
    "flowup",
    "node-red-plugin"
  ],
  "main": "./dist/${ctx.name}.js",
  "files": [
    "dist",
    "resources"
  ],
  "scripts": {
    "build": "flowup build",
    "dev": "flowup dev"
  },
  "devDependencies": {
${devDependencies}
  },
  "node-red": {
    "scope": "${ctx.name}",
    "plugins": {
      "${ctx.name}": "dist/${ctx.name}.js"
    }
  }
}
`
}

function renderViteConfig(ctx: TemplateContext): string {
  const { imports, plugins } = getFrameworkVitePluginSetup(ctx)
  const importBlock = imports.length ? `${imports.join('\n')}\n\n` : ''
  const clientOptions = [
    ...(plugins.length ? [`    plugins: [${plugins.join(', ')}],`] : []),
    '    config: { resolve: { alias: sharedAlias } },',
  ]
  const clientBlock = clientOptions.length ? `  client: {\n${clientOptions.join('\n')}\n  },` : ''

  return `${importBlock}import { defineConfig${ctx.unocss ? ', presetFlowupWind4' : ''} } from '@wry-smile/flowup'
import { fileURLToPath } from 'node:url'

const scope = '${ctx.name}'
const sharedAlias = { '@': fileURLToPath(new URL('.', import.meta.url)) }

export default defineConfig({
  scope,
  type: 'plugins',
  runtime: { config: { resolve: { alias: sharedAlias } } },
${clientBlock}
})
`
}

function renderTsconfigRoot(): string {
  return `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`
}

function renderTsconfigApp(ctx: TemplateContext): string {
  return `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": { "@/*": ["./*"] },
${isPreactFramework(ctx) || isSolidFramework(ctx) ? `    "jsx": "preserve",\n    "jsxImportSource": "${isPreactFramework(ctx) ? 'preact' : 'solid-js'}",\n` : ''}    "types": [
      "vite/client",
      "jquery"
    ],
    "strict": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": [
    "client/**/*.ts",
    "client/**/*.tsx",
    "client/**/*.vue",
    "client/**/*.svelte",
    "client/**/*.d.ts",
    "constant/**/*.ts",
    "types/**/*.ts",
    "types/**/*.d.ts"
  ]
}
`
}

function renderTsconfigNode(): string {
  return `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": { "@/*": ["./*"] },
    "types": ["node"],
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": [
    "flowup.config.ts",
    "runtime/**/*.ts",
    "constant/**/*.ts",
    "types/**/*.ts",
    "types/**/*.d.ts"
  ]
}
`
}

function renderConstants(ctx: TemplateContext): string {
  return `export const PLUGIN_NAME = "${ctx.name}";
export const PLUGIN_SCOPE = "${ctx.name}";
export const PLUGIN_TAG_NAME = "flowup-${ctx.name}-plugin";
export const PLUGIN_DISPLAY_NAME = "${ctx.properName}";
`
}

function renderTypes(ctx: TemplateContext): string {
  return `declare global {
  interface ${ctx.properName}Properties {
    name?: string;
  }
}

export {};
`
}

function renderRuntime(): string {
  return `import type { NodeAPI } from "node-red";
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME } from "../constant";

export default function pluginInit(RED: NodeAPI): void {
  RED.plugins.registerPlugin(PLUGIN_NAME, {
    type: PLUGIN_DISPLAY_NAME,
    onadd() {
    },
  });
}
`
}

function renderClientEntry(ctx: TemplateContext): string {
  if (isVueFramework(ctx)) return renderVuePluginClient(ctx)
  if (isSvelteFramework(ctx)) return renderSveltePluginClient(ctx)
  if (isPreactFramework(ctx)) return renderPreactPluginClient(ctx)
  if (isSolidFramework(ctx)) return renderSolidPluginClient(ctx)

  return `import { PLUGIN_NAME } from "../constant";

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
  },
});
`
}

function renderEditorHtml(ctx: TemplateContext): string {
  return `<!-- Flowup includes this template in the plugin's generated Node-RED editor HTML. -->
<!-- Add editor markup for ${ctx.name} here. Flowup bundles client/index.ts into the same HTML file. -->
`
}

function renderFrameworkFiles(ctx: TemplateContext): FileMap {
  if (isVueFramework(ctx)) return renderVuePluginFiles(ctx)
  if (isSvelteFramework(ctx)) return renderSveltePluginFiles(ctx)
  if (isPreactFramework(ctx)) return renderPreactPluginFiles(ctx)
  if (isSolidFramework(ctx)) return renderSolidPluginFiles(ctx)
  return {}
}

function renderClientGlobals(): string {
  return `/// <reference types="jquery" />

import type { EditorRED } from "node-red";

declare global {
  const RED: EditorRED;
  const jQuery: JQueryStatic;
  const $: JQueryStatic;
}

export {};
`
}

function renderLocaleJson(ctx: TemplateContext, locale: string): string {
  const chinese = locale === 'zh-CN'
  return `${JSON.stringify(
    {
      [ctx.name]: {
        label: { title: chinese ? '插件面板' : 'Plugin panel' },
      },
    },
    null,
    2,
  )}\n`
}

function renderReadme(ctx: TemplateContext): string {
  const stack = isVueFramework(ctx)
    ? '- Vue sidebar plugin'
    : isSvelteFramework(ctx)
      ? '- Svelte sidebar plugin'
      : isPreactFramework(ctx)
        ? '- Preact sidebar plugin'
        : isSolidFramework(ctx)
          ? '- Solid sidebar plugin'
          : '- Plain TypeScript plugin registration'
  const unocssLine = ctx.unocss ? '\n- UnoCSS Wind4 with a Flowup scope' : ''

  return `# ${ctx.name}

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

${stack}${unocssLine}

${renderFrameworkReadmeLines(ctx).join('\n')}

## Layout

\`\`\`
${ctx.name}/
├── package.json
├── flowup.config.ts
├── constant/
├── runtime/
├── client/
├── types/
├── locales/
├── icons/
└── resources/
\`\`\`

## Build and Package

\`\`\`bash
pnpm install
pnpm build
npm pack --dry-run
\`\`\`

Run \`pnpm dev\` to build and preview this plugin in Node-RED. Source changes
rebuild the package and restart Node-RED. The preview uses \`dist/\` as
\`nodesDir\`; configure it with \`nodeRed\` in
\`flowup.config.ts\`.

A full build generates \`dist/flowup.manifest.json\` for \`flowup assemble\`.
`
}
