import type { EditorNodeProperties, Node, NodeDef } from "node-red";

declare global {
  interface FrameworkGalleryVueNodeProperties {
    name?: string;
  }

  type FrameworkGalleryVueNodeNodeDef = Omit<NodeDef, keyof FrameworkGalleryVueNodeProperties>
    & FrameworkGalleryVueNodeProperties;

  type FrameworkGalleryVueNodeNode = Omit<Node, keyof FrameworkGalleryVueNodeProperties>
    & FrameworkGalleryVueNodeProperties;

  type FrameworkGalleryVueNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGalleryVueNodeProperties
  > & FrameworkGalleryVueNodeProperties;
}

export {};
