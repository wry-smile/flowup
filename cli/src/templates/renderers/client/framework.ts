import type { TemplateContext } from '../../../commands/gen/context'
import { renderEta } from '../eta'
import editorContentTemplate from '../../files/shared/client/editor-content.html.eta?raw'
import { TEMPLATE_DEPENDENCY_VERSIONS } from '../dependency-versions'

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

export function getEditorI18nNamespace(ctx: TemplateContext, kind: 'node' | 'plugin'): string {
  const group = kind === 'node' ? 'nodes' : 'plugins'
  return ctx.resourceEntry
    ? `flowup-${ctx.scope}/${ctx.scope}-${group}`
    : `flowup-${ctx.scope}/${ctx.name}`
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
      `    "@preact/signals": "${TEMPLATE_DEPENDENCY_VERSIONS['@preact/signals']}"`,
    )
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

export function renderFrameworkEditorContent(ctx: TemplateContext): string {
  const namespace = ctx.resourceEntry
    ? `flowup-${ctx.scope}/${ctx.scope}-nodes`
    : `flowup-${ctx.scope}/${ctx.name}`
  const resourcePath = [`resources/flowup-${ctx.scope}`, ctx.resourceEntry, 'badge.svg']
    .filter(Boolean)
    .join('/')
  const classes = ctx.unocss
    ? 'grid gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-800 dark:bg-slate-900'
    : 'flowup-vanilla-panel'
  return renderEta(editorContentTemplate, { ctx, namespace, resourcePath, classes })
}
