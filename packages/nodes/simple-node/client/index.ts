import { createApp, type App as VueApp } from "vue";
import "virtual:uno.css";
import App from "./App.vue";
import { useHydrateStore } from "./hydrate";
import { NODE_NAME, NODE_PALETTE_LABEL } from "../constant";

let app: VueApp | undefined;

function getMountTarget(): HTMLElement | null {
  return document.querySelector(
    `[data-flowup-scope="${NODE_NAME}"].flowup-vue-root`,
  );
}

function destroyApp(): void {
  app?.unmount();
  app = undefined;
}

RED.nodes.registerType<SimpleNodeClientNodeProperties>(NODE_NAME, {
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
