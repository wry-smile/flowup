import type { TemplateContext } from '../commands/gen/context'
import { TEMPLATE_DEPENDENCY_VERSIONS } from './dependency-versions'

export interface FrameworkPluginSetup {
  imports: string[]
  plugins: string[]
}

export function isVueFramework(ctx: TemplateContext): boolean {
  return ctx.clientFramework === 'vue'
}

export function isSvelteFramework(ctx: TemplateContext): boolean {
  return ctx.clientFramework === 'svelte'
}

export function isPreactFramework(ctx: TemplateContext): boolean {
  return ctx.clientFramework === 'preact'
}

export function isSolidFramework(ctx: TemplateContext): boolean {
  return ctx.clientFramework === 'solid'
}

export function getClientEntryPath(ctx: TemplateContext): string {
  return isPreactFramework(ctx) || isSolidFramework(ctx) ? 'client/index.tsx' : 'client/index.ts'
}

export function renderFrameworkI18n(ctx: TemplateContext, kind: 'node' | 'plugin'): string {
  const name = kind === 'node' ? 'NODE_NAME' : 'PLUGIN_NAME'
  return `import { createEditorI18n } from '@wry-smile/flowup/client'
import { ${name} } from '../constant'

export const t = createEditorI18n(RED, 'flowup-${ctx.name}/${ctx.name}', ${name})
`
}

export function getFrameworkDevDependencies(ctx: TemplateContext): string[] {
  const devDependencies: string[] = []

  if (isVueFramework(ctx)) {
    devDependencies.push(
      `    "@vitejs/plugin-vue": "${TEMPLATE_DEPENDENCY_VERSIONS['@vitejs/plugin-vue']}"`,
    )
    devDependencies.push(`    "vue": "${TEMPLATE_DEPENDENCY_VERSIONS.vue}"`)
  }

  if (isSvelteFramework(ctx)) {
    devDependencies.push(
      `    "@sveltejs/vite-plugin-svelte": "${TEMPLATE_DEPENDENCY_VERSIONS['@sveltejs/vite-plugin-svelte']}"`,
    )
    devDependencies.push(`    "svelte": "${TEMPLATE_DEPENDENCY_VERSIONS.svelte}"`)
  }

  if (isPreactFramework(ctx)) {
    devDependencies.push(
      `    "@preact/preset-vite": "${TEMPLATE_DEPENDENCY_VERSIONS['@preact/preset-vite']}"`,
    )
    devDependencies.push(`    "preact": "${TEMPLATE_DEPENDENCY_VERSIONS.preact}"`)
  }

  if (isSolidFramework(ctx)) {
    devDependencies.push(`    "solid-js": "${TEMPLATE_DEPENDENCY_VERSIONS['solid-js']}"`)
    devDependencies.push(
      `    "vite-plugin-solid": "${TEMPLATE_DEPENDENCY_VERSIONS['vite-plugin-solid']}"`,
    )
  }

  if (ctx.unocss) {
    devDependencies.push(`    "unocss": "${TEMPLATE_DEPENDENCY_VERSIONS.unocss}"`)
  }

  return devDependencies
}

export function getFrameworkVitePluginSetup(ctx: TemplateContext): FrameworkPluginSetup {
  const imports: string[] = []
  const plugins: string[] = []

  if (isVueFramework(ctx)) {
    imports.push(`import vue from '@vitejs/plugin-vue'`)
    plugins.push('vue()')
  }

  if (isSvelteFramework(ctx)) {
    imports.push(`import { svelte } from '@sveltejs/vite-plugin-svelte'`)
    plugins.push('svelte()')
  }

  if (isSolidFramework(ctx)) {
    imports.push(`import solid from 'vite-plugin-solid'`)
    plugins.push('solid()')
  }

  if (isPreactFramework(ctx)) {
    imports.push(`import { preact } from '@preact/preset-vite'`)
    plugins.push(`preact({ include: ['**/client/**/*.{jsx,tsx}'] })`)
  }

  if (ctx.unocss) {
    imports.push(`import UnoCSS from 'unocss/vite'`)
    plugins.unshift('UnoCSS({ presets: [presetFlowupWind4({ scope })] })')
  }

  return { imports, plugins }
}

export function renderFrameworkEditorContent(ctx: TemplateContext): string {
  if (isVueFramework(ctx))
    return `  <div data-flowup-scope="${ctx.name}" class="flowup-vue-root"></div>`

  if (isSvelteFramework(ctx))
    return `  <div data-flowup-scope="${ctx.name}" class="flowup-svelte-root"></div>`

  if (isPreactFramework(ctx))
    return `  <div data-flowup-scope="${ctx.name}" class="flowup-preact-root"></div>`

  if (isSolidFramework(ctx))
    return `  <div data-flowup-scope="${ctx.name}" class="flowup-solid-root"></div>`

  return `  <div data-flowup-scope="${ctx.name}" class="form-row">
    <label for="node-input-name" data-i18n="flowup-${ctx.name}/${ctx.name}:${ctx.name}.label.name"></label>
    <input id="node-input-name" type="text" />
  </div>`
}

export function renderFrameworkReadmeLines(ctx: TemplateContext): string[] {
  const lines = ['- `@wry-smile/flowup/client` 提供通用的 hydrate store']

  if (isVueFramework(ctx)) lines.push('- Vue 模板会生成 `client/hydrate.ts`')

  if (isSvelteFramework(ctx))
    lines.push('- Svelte 模板会生成 `client/App.svelte` 与 `client/hydrate.ts`')

  if (isPreactFramework(ctx) || isSolidFramework(ctx))
    lines.push(`- ${ctx.clientFramework} 模板会生成 TSX 组件与编辑器挂载逻辑`)

  if (ctx.unocss)
    lines.push('- UnoCSS 样式限定在 `data-flowup-scope` 容器内；弹出层挂载节点也需设置相同属性')

  lines.push('- 可复用常量会生成到 `constant/index.ts`')

  return lines
}
