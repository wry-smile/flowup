import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface FrameworkGalleryPreactNodeProperties {
  name?: string
}

export type FrameworkGalleryPreactNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGalleryPreactNodeProperties
> & FrameworkGalleryPreactNodeProperties

declare global {
  interface FrameworkGalleryPreactNodeProperties {
    name?: string
  }

  type FrameworkGalleryPreactNodeNodeDef = Omit<
    NodeDef,
    keyof FrameworkGalleryPreactNodeProperties
  > &
    FrameworkGalleryPreactNodeProperties

  type FrameworkGalleryPreactNodeNode = Omit<Node, keyof FrameworkGalleryPreactNodeProperties> &
    FrameworkGalleryPreactNodeProperties

  type FrameworkGalleryPreactNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGalleryPreactNodeProperties
  > &
    FrameworkGalleryPreactNodeProperties
}
