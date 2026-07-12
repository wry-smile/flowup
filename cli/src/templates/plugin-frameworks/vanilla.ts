export function renderVanillaPluginClient(): string {
  return `import { PLUGIN_NAME } from "../constant";

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
  },
});
`
}
