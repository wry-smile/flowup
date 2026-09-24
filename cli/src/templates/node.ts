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
  renderFrameworkEditorContent,
  renderFrameworkReadmeLines,
} from './client-framework'
import { getBaseTemplateDevDependencies } from './dependency-versions'
import { renderMitLicense } from './license'
import { renderSvelteNodeClient, renderSvelteNodeFiles } from './node-frameworks/svelte'
import { renderPreactNodeClient, renderPreactNodeFiles } from './node-frameworks/preact'
import { renderSolidNodeClient, renderSolidNodeFiles } from './node-frameworks/solid'
import { renderVanillaNodeClient } from './node-frameworks/vanilla'
import { renderVueNodeClient, renderVueNodeFiles } from './node-frameworks/vue'

export function nodeTemplate(ctx: TemplateContext): FileMap {
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
    'runtime/index.ts': renderRuntime(ctx),
    [getClientEntryPath(ctx)]: renderClientEntry(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    ...(ctx.clientFramework !== 'vanilla'
      ? { 'client/i18n.ts': renderFrameworkI18n(ctx, 'node') }
      : {}),
    'types/globals.d.ts': renderClientGlobals(),
    ...renderFrameworkFiles(ctx),
    'icons/.gitkeep': renderGitkeep('Palette icons referenced by client/index.ts -> icon.'),
    'icons/README.md': renderIconsReadme(ctx),
    'resources/.gitkeep': renderGitkeep(
      'Static resources served by Node-RED editor at /resources/<module>/<file>.',
    ),
    'resources/README.md': renderResourcesReadme(),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.html`] = renderLocaleHelpHtml(ctx)
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

function renderPackageJson(ctx: TemplateContext): string {
  const devDependencies = [
    ...getBaseTemplateDevDependencies(ctx.flowupSpecifier),
    ...getFrameworkDevDependencies(ctx),
  ].join(',\n')

  return `{
  "name": "flowup-${ctx.name}",
  "type": "module",
  "version": "1.0.0",
  "description": "A Node-RED node built with Flowup.",
  "license": "MIT",
  "keywords": [
    "node-red",
    "flowup",
    "node-red-node"
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
    "nodes": {
      "${ctx.name}": "dist/${ctx.name}.js"
    }
  }
}
`
}

function renderGitkeep(hint: string): string {
  return `# ${hint}\n# Drop your files into this directory and re-run \`flowup build\`.\n`
}

function renderIconsReadme(ctx: TemplateContext): string {
  return `# icons

Palette icons for this node. Node-RED reads the file referenced by the
\`icon\` field you optionally configure in \`client/index.ts\` from this directory.

## Convention

- File name: \`icons/${ctx.name}.png\` (recommended)
- Size: 24×24 px or 32×32 px recommended
- Format: PNG (with alpha)

## Referencing from the client

In \`client/index.ts\`:

\`\`\`ts
RED.nodes.registerType("${ctx.name}", {
  icon: "${ctx.name}.png",
  // ...
})
\`\`\`

flowup build copies this directory into \`dist/icons/\` automatically.
`
}

function renderResourcesReadme(): string {
  return `# resources

Node-RED (since 1.3) serves any file in this directory under
\`/resources/<module-name>/<file>\` so the editor can load it.

For a scoped module (\`@scope/foo\`), the path becomes
\`/resources/@scope/foo/<file>\`.

## Example

Drop an image at \`resources/help-banner.png\`, then in your
\`client/editor.html\` or \`client/help.html\`:

\`\`\`html
<img src="resources/<module-name>/help-banner.png" />
<script src="resources/<module-name>/library.js"></script>
\`\`\`

Note the URL must be **relative** (no leading \`/\`), so the browser
resolves it against the editor URL.

See https://nodered.org/docs/creating-nodes/resources
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
  if (
    isVueFramework(ctx) ||
    isSvelteFramework(ctx) ||
    isPreactFramework(ctx) ||
    isSolidFramework(ctx)
  ) {
    return `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
${isPreactFramework(ctx) || isSolidFramework(ctx) ? `    "jsxImportSource": "${isPreactFramework(ctx) ? 'preact' : 'solid-js'}",\n` : ''}    "strict": true,
    "isolatedModules": true,
    "types": [
      "vite/client",
      "jquery"
    ],
    "allowArbitraryExtensions": true,
    "paths": { "@/*": ["./*"] },
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
    "paths": { "@/*": ["./*"] },
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
  return `export const NODE_NAME = "${ctx.name}";
export const NODE_SCOPE = "${ctx.name}";
export const NODE_PALETTE_LABEL = "${ctx.name}";
`
}

function renderTypes(ctx: TemplateContext): string {
  return `import type { EditorNodeProperties, Node, NodeDef } from "node-red";

export interface ${ctx.properName}Properties {
  name?: string;
}

export type ${ctx.properName}ClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof ${ctx.properName}Properties
> & ${ctx.properName}Properties;

declare global {
  interface ${ctx.properName}Properties {
    name?: string;
  }

  type ${ctx.properName}NodeDef = Omit<NodeDef, keyof ${ctx.properName}Properties>
    & ${ctx.properName}Properties;

  type ${ctx.properName}Node = Omit<Node, keyof ${ctx.properName}Properties>
    & ${ctx.properName}Properties;

  type ${ctx.properName}ClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof ${ctx.properName}Properties
  > & ${ctx.properName}Properties;
}

export {};
`
}

function renderRuntime(ctx: TemplateContext): string {
  return `import type { NodeAPI, NodeDef } from "node-red";
import { NODE_NAME } from "../constant";

export default function nodeInit(RED: NodeAPI): void {
  function ${ctx.properName}NodeConstructor(
    this: ${ctx.properName}Node,
    config: ${ctx.properName}NodeDef
  ): void {
    RED.nodes.createNode(this, config as NodeDef);
    const node = this;
    node.on("input", (msg, send, done) => {
      send(msg);
      done();
    });
    node.on("close", (done: () => void) => {
      done();
    });
  }

  RED.nodes.registerType(NODE_NAME, ${ctx.properName}NodeConstructor);
}
`
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

function renderEditorHtml(ctx: TemplateContext): string {
  const content = renderFrameworkEditorContent(ctx)

  return `<script type="text/html" data-template-name="${ctx.name}">
${content}
</script>
`
}

function renderLocaleHelpHtml(ctx: TemplateContext): string {
  return `<script  type="text/x-red" data-help-name="${ctx.name}">
  <p>Node description goes here.</p>
</script>
`
}

function renderLocaleJson(ctx: TemplateContext, locale: string): string {
  const chinese = locale === 'zh-CN'
  return `${JSON.stringify(
    {
      [ctx.name]: {
        label: {
          name: chinese ? '名称' : 'Name',
        },
      },
    },
    null,
    2,
  )}\n`
}

function renderReadme(ctx: TemplateContext): string {
  const uiStackLines: string[] = []
  if (isVueFramework(ctx)) uiStackLines.push('- **Vue** (SFC, .vue files)')
  if (isSvelteFramework(ctx)) uiStackLines.push('- **Svelte** (.svelte files)')
  if (isPreactFramework(ctx)) uiStackLines.push('- **Preact** (TSX files)')
  if (isSolidFramework(ctx)) uiStackLines.push('- **Solid** (TSX files)')
  if (ctx.unocss) uiStackLines.push('- **UnoCSS Wind4** (scoped atomic CSS)')
  if (uiStackLines.length === 0) uiStackLines.push('- Plain HTML + TypeScript (no UI framework)')

  const addOnSection =
    isVueFramework(ctx) ||
    isSvelteFramework(ctx) ||
    isPreactFramework(ctx) ||
    isSolidFramework(ctx) ||
    ctx.unocss
      ? ''
      : `

## 可选:Vue / UnoCSS

本脚手架默认是纯 HTML + TypeScript,不依赖任何 UI 框架。

如果你之后想加 Vue 或 UnoCSS:

\`\`\`bash
pnpm add -D @vitejs/plugin-vue unocss
\`\`\`

然后在 \`flowup.config.ts\` 里手动 import + 注入 plugin:

\`\`\`ts
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig, presetFlowupWind4 } from '@wry-smile/flowup'

const scope = '${ctx.name}'
export default defineConfig({
  scope,
  client: { plugins: [UnoCSS({ presets: [presetFlowupWind4({ scope })] }), vue()] },
})
\`\`\`
`

  return `# ${ctx.name}

A Node-RED custom node scaffolded with [flowup](https://github.com/wry-smile/flowup).

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

## Build

\`\`\`bash
pnpm install
pnpm build
\`\`\`

## Preview in Node-RED

\`\`\`bash
pnpm dev
\`\`\`

Flowup builds the package and starts Node-RED with \`nodesDir\` pointing at
\`dist/\`. Source changes trigger a rebuild and one restart after the final
successful build. Configure the preview with \`nodeRed\` in \`flowup.config.ts\`.

Produces:

- \`dist/${ctx.name}.js\`
- \`dist/${ctx.name}.html\`
- \`dist/locales/\`
- \`dist/icons/\`
- \`dist/resources/\`
- \`dist/flowup.manifest.json\`

## Package

Build and pack from the project root:

\`\`\`bash
pnpm build
npm pack --dry-run
\`\`\`
${addOnSection}
`
    .trimEnd()
    .concat('\n')
}
