import { NODE_NAME, NODE_PALETTE_LABEL } from "../constant";
import { resourceUrl } from '@client-shared/showcase'

RED.nodes.registerType<FrameworkGalleryVanillaNodeClientNodeProperties>(NODE_NAME, {
  category: "function",
  color: "#dbeafe",
  icon: 'vanilla-node-vanilla.svg',
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
    const image = document.querySelector<HTMLImageElement>('[data-flowup-scope="framework-gallery"] img')
    if (image) image.src = resourceUrl('vanilla-node', 'badge.svg')
  },
});
