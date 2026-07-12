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
    devDependencies.push(`    "@vitejs/plugin-vue": "${TEMPLATE_DEPENDENCY_VERSIONS['@vitejs/plugin-vue']}"`)
    devDependencies.push(`    "vue": "${TEMPLATE_DEPENDENCY_VERSIONS.vue}"`)
  }

  if (isSvelteFramework(ctx)) {
    devDependencies.push(`    "@sveltejs/vite-plugin-svelte": "${TEMPLATE_DEPENDENCY_VERSIONS['@sveltejs/vite-plugin-svelte']}"`)
    devDependencies.push(`    "svelte": "${TEMPLATE_DEPENDENCY_VERSIONS.svelte}"`)
  }

  if (ctx.tailwind) {
    devDependencies.push(`    "@tailwindcss/vite": "${TEMPLATE_DEPENDENCY_VERSIONS['@tailwindcss/vite']}"`)
    devDependencies.push(`    "tailwindcss": "${TEMPLATE_DEPENDENCY_VERSIONS.tailwindcss}"`)
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

  if (ctx.tailwind) {
    imports.push(`import tailwindcss from '@tailwindcss/vite'`)
    plugins.push('tailwindcss()')
  }

  return { imports, plugins }
}

export function renderFrameworkEditorContent(ctx: TemplateContext, tagName: string): string {
  if (isVueFramework(ctx))
    return `  <${tagName}></${tagName}>`

  if (isSvelteFramework(ctx))
    return '  <div class="flowup-svelte-root"></div>'

  return '  <div></div>'
}

export function renderFrameworkReadmeLines(ctx: TemplateContext): string[] {
  const lines = ['- `@wry-smile/flowup/client` 提供通用的 hydrate store 与 Tailwind Shadow DOM bridge']

  if (isVueFramework(ctx))
    lines.push('- Vue 模板会生成 `client/hydrate.ts`')

  if (isSvelteFramework(ctx))
    lines.push('- Svelte 模板会生成 `client/App.svelte` 与 `client/hydrate.ts`')

  if (ctx.tailwind && isVueFramework(ctx))
    lines.push('- Tailwind 模板会额外生成 `client/useTailwind.ts`')

  if (ctx.tailwind && isSvelteFramework(ctx))
    lines.push('- Tailwind 模板会额外生成 `client/tailwind.css`')

  lines.push('- 可复用常量会生成到 `constant/index.ts`')

  return lines
}
