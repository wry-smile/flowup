import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface FrameworkGallerySvelteNodeProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type FrameworkGallerySvelteNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGallerySvelteNodeProperties
> &
  FrameworkGallerySvelteNodeProperties

declare global {
  interface FrameworkGallerySvelteNodeProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  type FrameworkGallerySvelteNodeNodeDef = NodeDef & FrameworkGallerySvelteNodeProperties

  type FrameworkGallerySvelteNodeNode = Node & FrameworkGallerySvelteNodeProperties

  type FrameworkGallerySvelteNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGallerySvelteNodeProperties
  > &
    FrameworkGallerySvelteNodeProperties
}

export {}
