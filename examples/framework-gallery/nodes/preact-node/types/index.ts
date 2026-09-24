import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface FrameworkGalleryPreactNodeProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type FrameworkGalleryPreactNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGalleryPreactNodeProperties
> &
  FrameworkGalleryPreactNodeProperties

declare global {
  interface FrameworkGalleryPreactNodeProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  type FrameworkGalleryPreactNodeNodeDef = NodeDef & FrameworkGalleryPreactNodeProperties

  type FrameworkGalleryPreactNodeNode = Node & FrameworkGalleryPreactNodeProperties

  type FrameworkGalleryPreactNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGalleryPreactNodeProperties
  > &
    FrameworkGalleryPreactNodeProperties
}

export {}
