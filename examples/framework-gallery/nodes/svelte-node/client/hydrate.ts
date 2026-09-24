import { createHydrateStore } from "@wry-smile/flowup/client";
import { writable } from "svelte/store";

export interface HydrateStoreState extends FrameworkGallerySvelteNodeClientNodeProperties {}

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
