import { createVueHydrateStore } from "@wry-smile/flowup/client";

export interface HydrateStoreState extends FrameworkGalleryVueNodeClientNodeProperties {}

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
