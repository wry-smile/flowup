import type { EditorNodeProperties, Node, NodeDef } from "node-red";

declare global {
  interface FrameworkGalleryVanillaNodeProperties {
    name?: string;
  }

  type FrameworkGalleryVanillaNodeNodeDef = Omit<NodeDef, keyof FrameworkGalleryVanillaNodeProperties>
    & FrameworkGalleryVanillaNodeProperties;

  type FrameworkGalleryVanillaNodeNode = Omit<Node, keyof FrameworkGalleryVanillaNodeProperties>
    & FrameworkGalleryVanillaNodeProperties;

  type FrameworkGalleryVanillaNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGalleryVanillaNodeProperties
  > & FrameworkGalleryVanillaNodeProperties;
}

export {};
