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

  if (ctx.unocss) {
    imports.push(`import UnoCSS from 'unocss/vite'`)
    imports.push(`import { presetFlowupWind4 } from '@wry-smile/flowup'`)
    const unoPlugin = `UnoCSS({ presets: [presetFlowupWind4({ scope: '${ctx.name}' })] })`
    if (isSvelteFramework(ctx)) plugins.unshift(unoPlugin)
    else plugins.push(unoPlugin)
  }

  return { imports, plugins }
}

export function renderFrameworkEditorContent(ctx: TemplateContext): string {
  if (isVueFramework(ctx))
    return `  <div data-flowup-scope="${ctx.name}" class="flowup-vue-root"></div>`

  if (isSvelteFramework(ctx))
    return `  <div data-flowup-scope="${ctx.name}" class="flowup-svelte-root"></div>`

  return '  <div></div>'
}

export function renderFrameworkReadmeLines(ctx: TemplateContext): string[] {
  const lines = ['- `@wry-smile/flowup/client` 提供通用的 hydrate store']

  if (isVueFramework(ctx)) lines.push('- Vue 模板会生成 `client/hydrate.ts`')

  if (isSvelteFramework(ctx))
    lines.push('- Svelte 模板会生成 `client/App.svelte` 与 `client/hydrate.ts`')

  if (ctx.unocss && isVueFramework(ctx))
    lines.push('- UnoCSS 样式限定在 `data-flowup-scope` 容器内；弹出层挂载节点也需设置相同属性')

  if (ctx.unocss && isSvelteFramework(ctx))
    lines.push('- UnoCSS 样式限定在 `data-flowup-scope` 容器内；弹出层挂载节点也需设置相同属性')

  lines.push('- 可复用常量会生成到 `constant/index.ts`')

  return lines
}
