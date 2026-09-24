import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderVueTypes } from '../framework-assets'

export function renderVuePluginFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.vue': renderVuePluginApp(ctx),
    'client/hydrate.ts': renderVuePluginHydrateStore(),
    'types/vue.d.ts': renderVueTypes(),
  }
}

export function renderVuePluginClient(ctx: TemplateContext): string {
  return `import { createApp } from "vue";
${ctx.unocss ? 'import "virtual:uno.css";\n' : ''}import App from "./App.vue";
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME, PLUGIN_SCOPE } from "../constant";

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
    if (RED.sidebar.containsTab(PLUGIN_NAME)) return;

    const target = document.createElement("div");
    target.dataset.flowupScope = PLUGIN_SCOPE;
    target.className = "flowup-vue-root";
    RED.sidebar.addTab({
      id: PLUGIN_NAME,
      name: PLUGIN_DISPLAY_NAME,
      label: PLUGIN_DISPLAY_NAME,
      iconClass: "fa fa-puzzle-piece",
      content: target,
    });
    createApp(App).mount(target);
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
  return `<script lang="ts" setup>
import { computed } from "vue";
import { useHydrateStore } from "./hydrate";
import { t } from "./i18n";
const hydrateStore = useHydrateStore();
const { name } = hydrateStore.refs;
const title = computed(() => name.value || "${ctx.name}");
</script>

<template>
  <div class="flowup-plugin-panel${ctx.unocss ? ' rounded-lg p-4' : ''}">
    <h3>{{ title }}</h3>
    <p>{{ t('label.title') }}</p>
  </div>
</template>

<style scoped>
.flowup-plugin-panel {
  padding: 12px;
}
</style>
`
}
