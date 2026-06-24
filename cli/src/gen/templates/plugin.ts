import type { FileMap, TemplateContext } from '../context'

export function pluginTemplate(ctx: TemplateContext): FileMap {
  return {
    'package.json': renderPackageJson(ctx),
    'vite.config.ts': renderViteConfig(ctx),
    'types/index.ts': renderTypes(ctx),
    'runtime/index.ts': renderRuntime(ctx),
    'client/index.ts': renderClient(ctx),
    'client/editor.html': renderEditorHtml(ctx),
    'client/help.html': renderHelpHtml(ctx),
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.json`] = renderLocaleJson(ctx, locale)
      return acc
    }, {}),
    'README.md': renderReadme(ctx),
  }
}

function renderPackageJson(ctx: TemplateContext): string {
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
    "@wry-smile/flowup": "workspace:*",
    "@types/node-red": "workspace:*"
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
  return `import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: '${ctx.name}',
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
  return `# ${ctx.name}

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## Build

\`\`\`bash
pnpm build
\`\`\`
`
}
