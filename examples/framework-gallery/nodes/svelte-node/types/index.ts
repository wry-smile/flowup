import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

declare global {
  interface FrameworkGallerySvelteNodeProperties {
    name?: string
  }

  type FrameworkGallerySvelteNodeNodeDef = Omit<
    NodeDef,
    keyof FrameworkGallerySvelteNodeProperties
  > &
    FrameworkGallerySvelteNodeProperties

  type FrameworkGallerySvelteNodeNode = Omit<Node, keyof FrameworkGallerySvelteNodeProperties> &
    FrameworkGallerySvelteNodeProperties

  type FrameworkGallerySvelteNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGallerySvelteNodeProperties
  > &
    FrameworkGallerySvelteNodeProperties
}
