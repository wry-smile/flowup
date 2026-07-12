import type { FileMap, TemplateContext } from '../commands/gen/context'
import {
  getFrameworkDevDependencies,
  getFrameworkVitePluginSetup,
  isSvelteFramework,
  isVueFramework,
  renderFrameworkEditorContent,
  renderFrameworkReadmeLines,
} from './client-framework'
import { getBaseTemplateDevDependencies } from './dependency-versions'
import { renderSveltePluginClient, renderSveltePluginFiles } from './plugin-frameworks/svelte'
import { renderVanillaPluginClient } from './plugin-frameworks/vanilla'
import { renderVuePluginClient, renderVuePluginFiles } from './plugin-frameworks/vue'

export function pluginTemplate(ctx: TemplateContext): FileMap {
  return {
    'package.json': renderPackageJson(ctx),
    'flowup.config.ts': renderViteConfig(ctx),
    'tsconfig.json': renderTsconfigRoot(),
    'tsconfig.app.json': renderTsconfigApp(ctx),
    'tsconfig.node.json': renderTsconfigNode(),
    'constant/index.ts': renderConstants(ctx),
    'types/index.ts': renderTypes(ctx),
    'runtime/index.ts': renderRuntime(ctx),
    'client/index.ts': renderClientEntry(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    'types/globals.d.ts': renderClientGlobals(),
    ...renderFrameworkFiles(ctx),
    'icons/.gitkeep': renderGitkeep('Palette icons for the plugin UI.'),
    'icons/README.md': renderIconsReadme(),
    'resources/.gitkeep': renderGitkeep('Static resources served by Node-RED editor at /resources/<module>/<file>.'),
    'resources/README.md': renderResourcesReadme(),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson()
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }
}

function renderGitkeep(hint: string): string {
  return `# ${hint}\n# Drop your files into this directory and re-run \`flowup build\`.\n`
}

function renderIconsReadme(): string {
  return `# icons

Palette icons for this plugin. flowup build copies this directory into
\`dist/icons/\` automatically.

Reference icons from \`client/index.ts\` or \`client/editor.html\` using
\`icons/\` (relative path).
`
}

function renderResourcesReadme(): string {
  return `# resources

Node-RED (since 1.3) serves any file in this directory under
\`/resources/<module-name>/<file>\` so the editor can load it.

For a scoped module (\`@scope/foo\`), the path becomes
\`/resources/@scope/foo/<file>\`.

Reference from your \`client/editor.html\` / \`client/help.html\` with
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
  "description": "",
  "author": "",
  "license": "ISC",
  "keywords": [],
  "scripts": {
    "build": "flowup build"
  },
  "devDependencies": {
${devDependencies}
  },
  "node-red": {
    "scope": "${ctx.name}",
    "plugins": {
      "${ctx.name}": "${ctx.name}.js"
    }
  }
}
`
}

function renderViteConfig(ctx: TemplateContext): string {
  const { imports, plugins } = getFrameworkVitePluginSetup(ctx)

  const importBlock = imports.length ? `${imports.join('\n')}\n\n` : ''
  const clientBlock = plugins.length
    ? `  client: {\n    plugins: [${plugins.join(', ')}],\n  },`
    : ''

  return `${importBlock}import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: '${ctx.name}',
  type: 'plugins',
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
  if (isVueFramework(ctx) || isSvelteFramework(ctx)) {
    return `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "isolatedModules": true,
    "types": [
      "vite/client",
      "jquery"
    ],
    "allowArbitraryExtensions": true,
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

  return `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": [
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
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "allowImportingTsExtensions": true,
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

function renderRuntime(ctx: TemplateContext): string {
  return `import type { NodeAPI } from "node-red";
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME } from "../constant/index.js";

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
  if (isVueFramework(ctx))
    return renderVuePluginClient()

  if (isSvelteFramework(ctx))
    return renderSveltePluginClient()

  return renderVanillaPluginClient()
}

function renderFrameworkFiles(ctx: TemplateContext): FileMap {
  if (isVueFramework(ctx))
    return renderVuePluginFiles(ctx)

  if (isSvelteFramework(ctx))
    return renderSveltePluginFiles(ctx)

  return {}
}

function renderEditorHtml(ctx: TemplateContext): string {
  const content = renderFrameworkEditorContent(ctx, `flowup-${ctx.name}-plugin`)

  return `<script type="text/html" data-template-name="${ctx.name}">
${content}
</script>
`
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

function renderLocaleJson(): string {
  return `{

}
`
}

function renderReadme(ctx: TemplateContext): string {
  const uiStackLines: string[] = []
  if (isVueFramework(ctx))
    uiStackLines.push('- **Vue** (SFC, .vue files)')
  if (isSvelteFramework(ctx))
    uiStackLines.push('- **Svelte** (.svelte files)')
  if (ctx.tailwind)
    uiStackLines.push('- **Tailwindcss** (utility-first CSS)')
  if (uiStackLines.length === 0)
    uiStackLines.push('- Plain HTML + TypeScript (no UI framework)')

  return `# ${ctx.name}

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

${uiStackLines.join('\n')}

## Client Helpers

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
`
}
