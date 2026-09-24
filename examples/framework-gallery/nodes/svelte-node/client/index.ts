import { mount, unmount } from "svelte";
import "virtual:uno.css";
import App from "./App.svelte";
import { useHydrateStore } from "./hydrate";
import { NODE_NAME, NODE_PALETTE_LABEL, NODE_SCOPE } from "../constant";

let app: ReturnType<typeof mount> | undefined;

function getMountTarget(): HTMLElement | null {
  return document.querySelector(
    `[data-flowup-scope="${NODE_SCOPE}"].flowup-svelte-root`,
  ) as HTMLElement | null;
}

function destroyApp(): void {
  if (!app)
    return;

  unmount(app);
  app = undefined;
}

RED.nodes.registerType<FrameworkGallerySvelteNodeClientNodeProperties>(NODE_NAME, {
  category: "function",
  color: "#a6bbcf",
  icon: 'svelte-node-svelte.svg',
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
