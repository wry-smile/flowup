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
import { renderSvelteNodeClient, renderSvelteNodeFiles } from './node-frameworks/svelte'
import { renderVanillaNodeClient } from './node-frameworks/vanilla'
import { renderVueNodeClient, renderVueNodeFiles } from './node-frameworks/vue'

export function nodeTemplate(ctx: TemplateContext): FileMap {
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
    'icons/.gitkeep': renderGitkeep('Palette icons referenced by client/index.ts -> icon.'),
    'icons/README.md': renderIconsReadme(ctx),
    'resources/.gitkeep': renderGitkeep('Static resources served by Node-RED editor at /resources/<module>/<file>.'),
    'resources/README.md': renderResourcesReadme(),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.html`] = renderLocaleHelpHtml(ctx)
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson()
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }
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
    "nodes": {
      "${ctx.name}": "${ctx.name}.js"
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
  icon: "icons/${ctx.name}.png",
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
  const clientBlock = plugins.length
    ? `  client: {\n    plugins: [${plugins.join(', ')}],\n  },`
    : ''

  return `${importBlock}import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: '${ctx.name}',
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
    "module": "ESNext",
    "moduleResolution": "Bundler",
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
export const NODE_TAG_NAME = "flowup-${ctx.name}-editor";
export const NODE_PALETTE_LABEL = "${ctx.name}";
`
}

function renderTypes(ctx: TemplateContext): string {
  return `import type { EditorNodeProperties, Node, NodeDef } from "node-red";

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
  if (isVueFramework(ctx))
    return renderVueNodeClient(ctx)

  if (isSvelteFramework(ctx))
    return renderSvelteNodeClient(ctx)

  return renderVanillaNodeClient(ctx)
}

function renderFrameworkFiles(ctx: TemplateContext): FileMap {
  if (isVueFramework(ctx))
    return renderVueNodeFiles(ctx)

  if (isSvelteFramework(ctx))
    return renderSvelteNodeFiles(ctx)

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
  const content = renderFrameworkEditorContent(ctx, `flowup-${ctx.name}-editor`)

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

  const addOnSection = (isVueFramework(ctx) || isSvelteFramework(ctx) || ctx.tailwind)
    ? ''
    : `

## 可选:Vue / Tailwindcss

本脚手架默认是纯 HTML + TypeScript,不依赖任何 UI 框架。

如果你之后想加 Vue 或 Tailwindcss:

\`\`\`bash
pnpm add -D @vitejs/plugin-vue @tailwindcss/vite
\`\`\`

然后在 \`flowup.config.ts\` 里手动 import + 注入 plugin:

\`\`\`ts
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  scope: '${ctx.name}',
  client: { plugins: [vue(), tailwindcss()] },
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

Produces:

- \`dist/${ctx.name}.js\`
- \`dist/${ctx.name}.html\`
- \`dist/locales/\`
- \`dist/icons/\`
- \`dist/resources/\`
${addOnSection}
`
}
