import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface FrameworkGalleryVanillaNodeProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type FrameworkGalleryVanillaNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGalleryVanillaNodeProperties
> &
  FrameworkGalleryVanillaNodeProperties

declare global {
  interface FrameworkGalleryVanillaNodeProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  type FrameworkGalleryVanillaNodeNodeDef = NodeDef & FrameworkGalleryVanillaNodeProperties

  type FrameworkGalleryVanillaNodeNode = Node & FrameworkGalleryVanillaNodeProperties

  type FrameworkGalleryVanillaNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGalleryVanillaNodeProperties
  > &
    FrameworkGalleryVanillaNodeProperties
}

export {}
