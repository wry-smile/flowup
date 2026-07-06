import type { FileMap, TemplateContext } from '../commands/gen/context'

export function pluginTemplate(ctx: TemplateContext): FileMap {
  return {
    'package.json': renderPackageJson(ctx),
    'vite.config.ts': renderViteConfig(ctx),
    'types/index.ts': renderTypes(ctx),
    'runtime/index.ts': renderRuntime(ctx),
    'client/index.ts': renderClient(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    'client/help.html': renderHelpHtml(ctx),
    // 资源目录(Node-RED 约定):icons 给 palette,resources 由 Node-RED editor 暴露
    'icons/.gitkeep': renderGitkeep('Palette icons for the plugin UI.'),
    'icons/README.md': renderIconsReadme(ctx),
    'resources/.gitkeep': renderGitkeep('Static resources served by Node-RED editor at /resources/<module>/<file>.'),
    'resources/README.md': renderResourcesReadme(ctx),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson(ctx, locale)
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }
}

function renderGitkeep(hint: string): string {
  return `# ${hint}\n# Drop your files into this directory and re-run \`flowup build\`.\n`
}

function renderIconsReadme(_ctx: TemplateContext): string {
  return `# icons

Palette icons for this plugin. flowup build copies this directory into
\`dist/icons/\` automatically.

Reference icons from \`client/index.ts\` or \`client/editor.html\` using
\`icons/\` (relative path).
`
}

function renderResourcesReadme(_ctx: TemplateContext): string {
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
  const extraDevDeps: string[] = []
  if (ctx.vue)
    extraDevDeps.push(`    "@vitejs/plugin-vue": "^${ctx.vueVersion}"`)
  if (ctx.tailwind)
    extraDevDeps.push(`    "@tailwindcss/vite": "^${ctx.tailwindVersion}"`)
  const devDepsBlock = [
    `    "@types/node-red": "^1.3.5"`,
    `    "@wry-smile/flowup": "${ctx.flowupSpecifier}"`,
    `    "typescript": "^6.0.3"`,
    ...extraDevDeps,
  ].join(',\n')

  // 不放 runtime dependencies:生成代码里所有 node-red 引用都是 `import type`,
  // 编译时擦除。运行时由宿主 Node-RED 实例提供,不需要自带。
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
${devDepsBlock}
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
  const imports: string[] = []
  const plugins: string[] = []
  if (ctx.vue) {
    imports.push(`import vue from '@vitejs/plugin-vue'`)
    plugins.push('vue()')
  }
  if (ctx.tailwind) {
    imports.push(`import tailwindcss from '@tailwindcss/vite'`)
    plugins.push('tailwindcss()')
  }
  const importBlock = imports.length ? `${imports.join('\n')}\n\n` : ''
  const clientLine = plugins.length
    ? `  client: { plugins: [${plugins.join(', ')}] },`
    : ''

  return `${importBlock}import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: '${ctx.name}',
${clientLine}
})
`
}

function renderTypes(ctx: TemplateContext): string {
  return `export interface ${ctx.properName}Options {
}
`
}

function renderRuntime(ctx: TemplateContext): string {
  return `import type { NodeAPI } from "node-red";

const pluginInit = (RED: NodeAPI): void => {
  RED.plugins.registerPlugin("${ctx.name}", {
    type: "${ctx.properName}",
    onadd() {
      // 客户端加载完成时回调
    },
  });
};

export default pluginInit;
`
}

function renderClient(ctx: TemplateContext): string {
  return `import type { EditorRED } from "node-red";

declare const RED: EditorRED;

RED.plugins.registerPlugin("plugin-${ctx.name}", {
  onadd() {
    // 客户端插件挂载逻辑
  },
});
`
}

function renderEditorHtml(ctx: TemplateContext): string {
  return `<script type="text/html" data-template-name="${ctx.name}">
  <div class="form-row">
    <label for="node-input-name"><i class="icon-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="Name">
  </div>
</script>

<script type="module" src="./index.ts"></script>
`
}

function renderHelpHtml(ctx: TemplateContext): string {
  return `<script type="text/html" data-help-name="${ctx.name}">
  <p>Plugin description goes here.</p>
</script>
`
}

function renderLocaleJson(_ctx: TemplateContext, _locale: string): string {
  return `{

}
`
}

function renderReadme(ctx: TemplateContext): string {
  const uiStackLines: string[] = []
  if (ctx.vue)
    uiStackLines.push('- **Vue** (SFC, .vue files)')
  if (ctx.tailwind)
    uiStackLines.push('- **Tailwindcss** (utility-first CSS)')
  if (uiStackLines.length === 0)
    uiStackLines.push('- Plain HTML + TypeScript (no UI framework)')

  const addOnSection = (ctx.vue || ctx.tailwind)
    ? ''
    : `

## 可选:Vue / Tailwindcss

本脚手架默认是纯 HTML + TypeScript,不依赖任何 UI 框架。

如果之后想加 Vue 或 Tailwindcss:

\`\`\`bash
pnpm add -D @vitejs/plugin-vue @tailwindcss/vite
\`\`\`

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

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

${uiStackLines.join('\n')}

## Layout

\`\`\`
${ctx.name}/
├── package.json
├── vite.config.ts
├── runtime/        # Plugin runtime registration (NodeAPI)
├── client/         # Editor-side plugin code
├── types/          # shared TS types
├── locales/        # i18n catalogs
├── icons/          # palette icons (optional)
└── resources/      # static assets served by Node-RED editor
\`\`\`

## Build

\`\`\`bash
pnpm install
pnpm build
\`\`\`

Produces \`dist/${ctx.name}.js\` (runtime) + \`dist/${ctx.name}.html\` (editor),
plus copied \`dist/locales/\`, \`dist/icons/\`, \`dist/resources/\` if those
directories contain files.

> 默认走「多 chunk」产物。如果要 inline 成单个 .html,在 vite.config.ts 里
> 把 \`singleFilePlugin: true\` 加上(cli 内置 Rollup 插件,无需额外依赖)。${addOnSection}

## resources/ convention

Drop any asset into \`resources/\`; Node-RED serves it at
\`/resources/<module-name>/<path>\`. Reference with **relative** URLs from
\`client/editor.html\` / \`client/help.html\`:

\`\`\`html
<img src="resources/<module-name>/banner.png" />
\`\`\`

See \`resources/README.md\` and <https://nodered.org/docs/creating-nodes/resources>.
`
}
