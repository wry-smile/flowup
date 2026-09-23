import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderVueTypes } from '../framework-assets'
export function renderVueNodeFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.vue': renderVueNodeApp(ctx),
    'client/hydrate.ts': renderVueNodeHydrateStore(ctx),
    'types/vue.d.ts': renderVueTypes(),
  }
}

export function renderVueNodeClient(ctx: TemplateContext): string {
  return `import { createApp, type App as VueApp } from "vue";
${ctx.unocss ? 'import "virtual:uno.css";\n' : ''}import App from "./App.vue";
import { useHydrateStore } from "./hydrate";
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from "../constant";

let app: VueApp | undefined;

function getMountTarget(): HTMLElement | null {
  return document.querySelector(
    \`[data-flowup-scope="\${NODE_SCOPE}"].flowup-vue-root\`,
  );
}

function destroyApp(): void {
  app?.unmount();
  app = undefined;
}

RED.nodes.registerType<${ctx.properName}ClientNodeProperties>(NODE_NAME, {
  category: "function",
  color: "#a6bbcf",
  defaults: {
    name: { value: "" },
  },
  inputs: 1,
  outputs: 1,
  paletteLabel: NODE_PALETTE_LABEL,
  label() {
    return this.name || NODE_NAME;
  },
  oneditprepare() {
    useHydrateStore().hydrate(this);
    destroyApp();
    const target = getMountTarget();
    if (target) {
      app = createApp(App);
      app.mount(target);
    }
  },
  oneditsave() {
    useHydrateStore().commit(this);
    destroyApp();
  },
  oneditcancel() {
    destroyApp();
  },
});
`
}

function renderVueNodeHydrateStore(ctx: TemplateContext): string {
  return `import { createVueHydrateStore } from "@wry-smile/flowup/client";

export interface HydrateStoreState extends ${ctx.properName}ClientNodeProperties {}

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

function renderVueNodeApp(ctx: TemplateContext): string {
  return `<script lang="ts" setup>
import { computed } from "vue";
import { useHydrateStore } from "./hydrate";
const hydrateStore = useHydrateStore();
const { name } = hydrateStore.refs;
const title = computed(() => name.value || "${ctx.name}");
</script>

<template>
  <div class="flowup-panel${ctx.unocss ? ' rounded-lg p-4' : ''}">
    <h3>{{ title }}</h3>
    <p>Vue editor scaffold for ${ctx.name}.</p>
  </div>
</template>

<style scoped>
.flowup-panel {
  padding: 12px;
}
</style>
`
}
