import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderTailwindCss, renderVueTailwindBridge } from '../framework-assets'

export function renderVueNodeFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.ce.vue': renderVueNodeApp(ctx),
    'client/hydrate.ts': renderVueNodeHydrateStore(ctx),
    ...(ctx.tailwind
      ? {
          'client/useTailwind.ts': renderVueTailwindBridge(),
          'client/tailwind.css': renderTailwindCss(),
        }
      : {}),
  }
}

export function renderVueNodeClient(ctx: TemplateContext): string {
  return `import { defineCustomElement } from "vue";
import AppCe from "./App.ce.vue";
import { useHydrateStore } from "./hydrate";
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_TAG_NAME } from "../constant";

function ensureNodePanelElement(): void {
  if (!customElements.get(NODE_TAG_NAME)) {
    customElements.define(
      NODE_TAG_NAME,
      defineCustomElement(AppCe),
    );
  }
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
    const { hydrate } = useHydrateStore();

    hydrate(this);

    ensureNodePanelElement();
  },
  oneditsave() {
    const { commit } = useHydrateStore();

    commit(this);
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
  <div class="flowup-panel">
    <h3>{{ title }}</h3>
    <p>Vue custom-element editor scaffold for ${ctx.name}.</p>
  </div>
</template>

<style scoped>
.flowup-panel {
  padding: 12px;
}
</style>
`
}
