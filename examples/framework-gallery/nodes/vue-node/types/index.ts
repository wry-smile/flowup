import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface FrameworkGalleryVueNodeProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type FrameworkGalleryVueNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGalleryVueNodeProperties
> &
  FrameworkGalleryVueNodeProperties

declare global {
  interface FrameworkGalleryVueNodeProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  type FrameworkGalleryVueNodeNodeDef = NodeDef & FrameworkGalleryVueNodeProperties

  type FrameworkGalleryVueNodeNode = Node & FrameworkGalleryVueNodeProperties

  type FrameworkGalleryVueNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGalleryVueNodeProperties
  > &
    FrameworkGalleryVueNodeProperties
}

export {}
