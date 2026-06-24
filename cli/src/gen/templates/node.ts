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
    ...ctx.locales.reduce<FileMap>((acc, locale) => {
      acc[`locales/${locale}/${ctx.name}.html`] = renderLocaleHelpHtml(ctx, locale)
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
    "nodes": {
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
  icon: "file.png",
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
  return `# ${ctx.name}

A Node-RED custom node scaffolded with [flowup](https://github.com/wry-smile/flowup).

## Build

\`\`\`bash
pnpm build
\`\`\`

This produces:

- \`dist/${ctx.name}.js\` — runtime (server-side) bundle
- \`dist/${ctx.name}.html\` — editor (browser) bundle, inlined single-file
- \`dist/locales/\` — i18n help catalogs
- \`dist/icons/\` — palette icons (if any)
- \`dist/resources/\` — node-level static resources (if any)
`
}
