import type { FileMap, TemplateContext } from '../context'

export function nodeTemplate(ctx: TemplateContext): FileMap {
  return {
    'package.json': renderPackageJson(ctx),
    'vite.config.ts': renderViteConfig(ctx),
    'types/index.ts': renderTypes(ctx),
    'runtime/index.ts': renderRuntime(ctx),
    'runtime/types.ts': renderRuntimeTypes(ctx),
    'client/index.ts': renderClient(ctx),
    'client/types.ts': renderClientTypes(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    'client/help.html': renderHelpHtml(ctx),
    // 资源目录(Node-RED 约定):
    // - icons/<name>.png — palette 图标(被 client/index.ts 的 icon 字段引用)
    // - resources/<file>  — Node-RED editor 通过 /resources/<module-name>/<file> 暴露
    'icons/.gitkeep': renderGitkeep('Palette icons referenced by client/index.ts -> icon.'),
    'icons/README.md': renderIconsReadme(ctx),
    'resources/.gitkeep': renderGitkeep('Static resources served by Node-RED editor at /resources/<module>/<file>.'),
    'resources/README.md': renderResourcesReadme(ctx),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.html`] = renderLocaleHelpHtml(ctx, locale)
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson(ctx, locale)
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }
}

function renderPackageJson(ctx: TemplateContext): string {
  // 按 ctx.vue / ctx.tailwind 把可选 vite 插件加进 devDependencies。
  // 所有 devDependencies 都用 ^x.y.z 形式,允许自动升 patch/minor,
  // 版本号与 pnpm-workspace.yaml catalog 同步。
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
    "nodes": {
      "${ctx.name}": "${ctx.name}.js"
    }
  }
}
`
}

function renderGitkeep(hint: string): string {
  // 空目录占位 + 一行 hint 注释,git 跟踪这个文件 = 跟踪目录
  return `# ${hint}\n# Drop your files into this directory and re-run \`flowup build\`.\n`
}

function renderIconsReadme(ctx: TemplateContext): string {
  return `# icons

Palette icons for this node. Node-RED reads the file referenced by the
\`icon\` field in \`client/index.ts\` from this directory.

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

function renderResourcesReadme(_ctx: TemplateContext): string {
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
  // 按 ctx.vue / ctx.tailwind 自动 import + 注入 plugin。
  // flowup cli 自身不依赖这两个包(由子包 devDependencies 装),但会通过
  // client.plugins 暴露口子让用户手动接入。这里模板把这种手动接入自动化。
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
  // 没有可选插件时,client config 就是空对象(走纯 HTML/TS 默认)
  // 有可选插件时,client.plugins 数组塞进去
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
  return `import type { Node, NodeAPI, NodeDef } from "node-red";
import type { ${ctx.properName}Node, ${ctx.properName}NodeDef } from "./types";

const nodeInit = (RED: NodeAPI): void => {
  function ${ctx.properName}NodeConstructor(
    this: ${ctx.properName}Node,
    config: ${ctx.properName}NodeDef
  ): void {
    RED.nodes.createNode(this, config);
    const node = this;
    node.on("input", (msg, send, done) => {
      // 业务逻辑写在这里
      send(msg);
      done();
    });
    node.on("close", (done: () => void) => {
      done();
    });
  }

  RED.nodes.registerType("${ctx.name}", ${ctx.properName}NodeConstructor);
};

export default nodeInit;
`
}

function renderRuntimeTypes(ctx: TemplateContext): string {
  return `import type { Node, NodeDef } from "node-red";
import type { ${ctx.properName}Options } from "../types";

export interface ${ctx.properName}NodeDef extends NodeDef, ${ctx.properName}Options {}
export type ${ctx.properName}Node = Node & ${ctx.properName}Options;
`
}

function renderClient(ctx: TemplateContext): string {
  return `import type { EditorRED } from "node-red";
import type { ${ctx.properName}ClientNodeProperties } from "./types";

declare const RED: EditorRED;

RED.nodes.registerType<${ctx.properName}ClientNodeProperties>("${ctx.name}", {
  category: "function",
  color: "#a6bbcf",
  defaults: {
    name: { value: "" },
  },
  inputs: 1,
  outputs: 1,
  // 图标位于 icons/<name>.png,build 后会被拷到 dist/icons/
  icon: "icons/${ctx.name}.png",
  paletteLabel: "${ctx.name}",
  label() {
    return this.name || "${ctx.name}";
  },
});
`
}

function renderClientTypes(ctx: TemplateContext): string {
  return `import type { EditorNodeProperties } from "node-red";
import type { ${ctx.properName}Options } from "../types";

export interface ${ctx.properName}ClientNodeProperties
  extends EditorNodeProperties,
  ${ctx.properName}Options {}
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
  <p>Node description goes here.</p>
  <!--
    Reference static resources via relative URLs, e.g.:
    <img src="resources/<module-name>/banner.png" />
    See resources/README.md for the full convention.
  -->
</script>
`
}

function renderLocaleHelpHtml(ctx: TemplateContext, _locale: string): string {
  return `<script  type="text/x-red" data-help-name="${ctx.name}">
  <p>Node description goes here.</p>
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

如果你之后想加 Vue 或 Tailwindcss:

\`\`\`bash
pnpm add -D @vitejs/plugin-vue @tailwindcss/vite
\`\`\`

然后在 \`vite.config.ts\` 里手动 import + 注入 plugin:

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

## Layout

\`\`\`
${ctx.name}/
├── package.json
├── vite.config.ts
├── runtime/        # Node-RED server-side handler (NodeInitializer)
├── client/         # Node-RED editor UI (EditorRED register, editor.html, help.html)
├── types/          # shared TS types (Options interface)
├── locales/        # i18n help catalogs (en-US / zh-CN by default)
├── icons/          # palette icons (e.g. ${ctx.name}.png, referenced from client/index.ts)
└── resources/      # static assets served by Node-RED at /resources/<module>/<file>
\`\`\`

## Build

\`\`\`bash
pnpm install
pnpm build
\`\`\`

Produces:

- \`dist/${ctx.name}.js\` — runtime (server-side) bundle
- \`dist/${ctx.name}.html\` — editor (browser) bundle
- \`dist/locales/\` — i18n help catalogs
- \`dist/icons/\` — palette icons (if any files are present)
- \`dist/resources/\` — node-level static resources (if any files are present)

> 默认走「多 chunk」产物。如果你想要把所有 JS/CSS 内联成单个 .html(常见于
> Node-RED editor 部署),在 vite.config.ts 里把 \`singleFilePlugin: true\` 加上,
> 该插件是 cli 内置的 Rollup hook 实现,无需安装任何额外依赖。${addOnSection}

## Conventions

### icons/

Drop a PNG at \`icons/${ctx.name}.png\`. The \`icon\` field in \`client/index.ts\`
already points to this path; flowup copies it into \`dist/icons/\` on build.

### resources/

Drop any static asset (images, JS, CSS) into \`resources/\`. Node-RED serves
them at \`/resources/<module-name>/<path>\` — reference them with **relative**
URLs from your \`editor.html\` / \`help.html\`:

\`\`\`html
<img src="resources/<module-name>/banner.png" />
\`\`\`

See \`resources/README.md\` for details and the Node-RED spec:
<https://nodered.org/docs/creating-nodes/resources>
`
}
