import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderSvelteTypes } from '../framework-assets'

export function renderSveltePluginFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.svelte': renderSveltePluginApp(ctx),
    'client/hydrate.ts': renderSveltePluginHydrateStore(),
    'types/svelte.d.ts': renderSvelteTypes(),
  }
}

export function renderSveltePluginClient(ctx: TemplateContext): string {
  return `import { mount } from "svelte";
${ctx.unocss ? 'import "virtual:uno.css";\n' : ''}import App from "./App.svelte";
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME } from "../constant";

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
    if (RED.sidebar.containsTab(PLUGIN_NAME)) return;

    const target = document.createElement("div");
    target.dataset.flowupScope = PLUGIN_NAME;
    target.className = "flowup-svelte-root";
    RED.sidebar.addTab({
      id: PLUGIN_NAME,
      name: PLUGIN_DISPLAY_NAME,
      label: PLUGIN_DISPLAY_NAME,
      iconClass: "fa fa-puzzle-piece",
      content: target,
    });
    mount(App, { target });
  },
});
`
}

function renderSveltePluginHydrateStore(): string {
  return `import { createHydrateStore } from "@wry-smile/flowup/client";
import { writable } from "svelte/store";

export interface HydrateStoreState {
  name?: string;
}

export function getDefaultHydrateStoreState(): HydrateStoreState {
  return {
    name: undefined,
  };
}

const store = createHydrateStore(
  getDefaultHydrateStoreState(),
);

const state = writable<HydrateStoreState>(getDefaultHydrateStoreState());

function syncState(): void {
  state.set(store.getSnapshot() as HydrateStoreState);
}

syncState();

export function useHydrateStore() {
  return {
    state,
    hydrate(source: Partial<HydrateStoreState>) {
      store.hydrate(source);
      syncState();
    },
    patch<K extends keyof HydrateStoreState>(key: K, value: HydrateStoreState[K]) {
      store.patch(key, value);
      syncState();
    },
    commit(target: Partial<HydrateStoreState>) {
      store.commit(target);
    },
    reset() {
      store.reset();
      syncState();
    },
  };
}
`
}

function renderSveltePluginApp(ctx: TemplateContext): string {
  return `<script lang="ts">
import { derived } from "svelte/store";
import { useHydrateStore } from "./hydrate";
const hydrateStore = useHydrateStore();
const name = derived(hydrateStore.state, $state => $state.name ?? "${ctx.name}");
</script>

<div class="flowup-plugin-panel">
  <h3>{$name}</h3>
  <p>Svelte plugin scaffold for ${ctx.name}.</p>
</div>

<style>
  .flowup-plugin-panel {
    padding: 12px;
  }
</style>
`
}
