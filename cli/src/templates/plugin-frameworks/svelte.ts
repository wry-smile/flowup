import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderSvelteTypes, renderTailwindCss } from '../framework-assets'

export function renderSveltePluginFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.svelte': renderSveltePluginApp(ctx),
    'client/hydrate.ts': renderSveltePluginHydrateStore(),
    'types/svelte.d.ts': renderSvelteTypes(),
    ...(ctx.tailwind
      ? {
          'client/tailwind.css': renderTailwindCss(),
        }
      : {}),
  }
}

export function renderSveltePluginClient(): string {
  return `import { mount, unmount } from "svelte";
import App from "./App.svelte";
import { PLUGIN_NAME } from "../constant";

let app: ReturnType<typeof mount> | undefined;

function getMountTarget(): HTMLElement | null {
  return document.querySelector(
    \`[data-template-name="\${PLUGIN_NAME}"] .flowup-svelte-root\`,
  ) as HTMLElement | null;
}

function destroyApp(): void {
  if (!app)
    return;

  unmount(app);
  app = undefined;
}

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
    destroyApp();

    const target = getMountTarget();
    if (target)
      app = mount(App, { target });
  },
  onremove() {
    destroyApp();
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
  const tailwindImport = ctx.tailwind
    ? `import "./tailwind.css";
`
    : ''

  return `<script lang="ts">
import { derived } from "svelte/store";
import { useHydrateStore } from "./hydrate";
${tailwindImport}
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
