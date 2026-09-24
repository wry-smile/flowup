import type { EditorNodeProperties, Node, NodeDef } from "node-red";

export interface FrameworkGallerySolidNodeProperties {
  name?: string
}

export type FrameworkGallerySolidNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGallerySolidNodeProperties
> & FrameworkGallerySolidNodeProperties

declare global {
  interface FrameworkGallerySolidNodeProperties {
    name?: string;
  }

  type FrameworkGallerySolidNodeNodeDef = Omit<NodeDef, keyof FrameworkGallerySolidNodeProperties>
    & FrameworkGallerySolidNodeProperties;

  type FrameworkGallerySolidNodeNode = Omit<Node, keyof FrameworkGallerySolidNodeProperties>
    & FrameworkGallerySolidNodeProperties;

  type FrameworkGallerySolidNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGallerySolidNodeProperties
  > & FrameworkGallerySolidNodeProperties;
}

export {};
