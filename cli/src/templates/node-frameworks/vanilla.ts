import type { TemplateContext } from '../../commands/gen/context'

export function renderVanillaNodeClient(ctx: TemplateContext): string {
  return `import { NODE_NAME, NODE_PALETTE_LABEL } from "../constant";

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
});
`
}
