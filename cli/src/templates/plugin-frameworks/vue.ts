import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderTailwindCss, renderVueTailwindBridge } from '../framework-assets'

export function renderVuePluginFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.ce.vue': renderVuePluginApp(ctx),
    'client/hydrate.ts': renderVuePluginHydrateStore(),
    ...(ctx.tailwind
      ? {
          'client/useTailwind.ts': renderVueTailwindBridge(),
          'client/tailwind.css': renderTailwindCss(),
        }
      : {}),
  }
}

export function renderVuePluginClient(): string {
  return `import { defineCustomElement } from "vue";
import AppCe from "./App.ce.vue";
import { PLUGIN_NAME, PLUGIN_TAG_NAME } from "../constant";

function ensurePluginPanelElement(): void {
  if (!customElements.get(PLUGIN_TAG_NAME)) {
    customElements.define(
      PLUGIN_TAG_NAME,
      defineCustomElement(AppCe),
    );
  }
}

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
    ensurePluginPanelElement();
  },
});
`
}

function renderVuePluginHydrateStore(): string {
  return `import { createVueHydrateStore } from "@wry-smile/flowup/client";

export interface HydrateStoreState {
  name?: string;
}

export function getDefaultHydrateStoreState(): HydrateStoreState {
  return {
    name: undefined,
  };
}

const hydrate = createVueHydrateStore(
  getDefaultHydrateStoreState(),
);

export function useHydrateStore() {
  return hydrate;
}
`
}

function renderVuePluginApp(ctx: TemplateContext): string {
  const tailwindImport = ctx.tailwind
    ? `import { useTailwindcss } from "./useTailwind";

useTailwindcss();
`
    : ''

  return `<script lang="ts" setup>
import { computed } from "vue";
import { useHydrateStore } from "./hydrate";
${tailwindImport}
const hydrateStore = useHydrateStore();
const { name } = hydrateStore.refs;
const title = computed(() => name.value || "${ctx.name}");
</script>

<template>
  <div class="flowup-plugin-panel">
    <h3>{{ title }}</h3>
    <p>Vue plugin scaffold for ${ctx.name}.</p>
  </div>
</template>

<style scoped>
.flowup-plugin-panel {
  padding: 12px;
}
</style>
`
}
