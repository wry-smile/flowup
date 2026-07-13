import type { EditorNodeProperties, Node, NodeDef } from "node-red";

declare global {
  interface SimpleNodeProperties {
    name?: string;
  }

  type SimpleNodeNodeDef = Omit<NodeDef, keyof SimpleNodeProperties>
    & SimpleNodeProperties;

  type SimpleNodeNode = Omit<Node, keyof SimpleNodeProperties>
    & SimpleNodeProperties;

  type SimpleNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof SimpleNodeProperties
  > & SimpleNodeProperties;
}

export {};
