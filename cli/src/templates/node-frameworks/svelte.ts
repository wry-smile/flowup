import type { FileMap, TemplateContext } from '../../commands/gen/context'
import { renderSvelteTypes, renderTailwindCss } from '../framework-assets'

export function renderSvelteNodeFiles(ctx: TemplateContext): FileMap {
  return {
    'client/App.svelte': renderSvelteNodeApp(ctx),
    'client/hydrate.ts': renderSvelteNodeHydrateStore(ctx),
    'types/svelte.d.ts': renderSvelteTypes(),
    ...(ctx.tailwind
      ? {
          'client/tailwind.css': renderTailwindCss(),
        }
      : {}),
  }
}

export function renderSvelteNodeClient(ctx: TemplateContext): string {
  return `import { mount, unmount } from "svelte";
import App from "./App.svelte";
import { useHydrateStore } from "./hydrate";
import { NODE_NAME, NODE_PALETTE_LABEL } from "../constant";

let app: ReturnType<typeof mount> | undefined;

function getMountTarget(): HTMLElement | null {
  return document.querySelector(
    \`[data-template-name="\${NODE_NAME}"] .flowup-svelte-root\`,
  ) as HTMLElement | null;
}

function destroyApp(): void {
  if (!app)
    return;

  unmount(app);
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
    const hydrateStore = useHydrateStore();

    hydrateStore.hydrate(this);
    destroyApp();

    const target = getMountTarget();
    if (target)
      app = mount(App, { target });
  },
  oneditsave() {
    const hydrateStore = useHydrateStore();

    hydrateStore.commit(this);
    destroyApp();
  },
  oneditcancel() {
    destroyApp();
  },
});
`
}

function renderSvelteNodeHydrateStore(ctx: TemplateContext): string {
  return `import { createHydrateStore } from "@wry-smile/flowup/client";
import { writable } from "svelte/store";

export interface HydrateStoreState extends ${ctx.properName}ClientNodeProperties {}

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

function renderSvelteNodeApp(ctx: TemplateContext): string {
  const tailwindImport = ctx.tailwind
    ? `import "./tailwind.css";
`
    : ''

  return `<script lang="ts">
import { derived } from "svelte/store";
import { useHydrateStore } from "./hydrate";
${tailwindImport}
const hydrateStore = useHydrateStore();
const name = derived(hydrateStore.state, $state => $state.name ?? "");

function handleNameInput(event: Event): void {
  const value = (event.currentTarget as HTMLInputElement).value.trim();
  hydrateStore.patch("name", value || undefined);
}
</script>

<div class="form-row">
  <label for="node-input-name">
    <i class="icon-tag"></i>
    Name
  </label>
  <input
    id="node-input-name"
    type="text"
    placeholder="Name"
    value={$name}
    on:input={handleNameInput}
  />
</div>
`
}
