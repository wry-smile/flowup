import type { NodeAPI } from "node-red";
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME } from "../constant";

export default function pluginInit(RED: NodeAPI): void {
  RED.plugins.registerPlugin(PLUGIN_NAME, {
    type: PLUGIN_DISPLAY_NAME,
    onadd() {
    },
  });
}
