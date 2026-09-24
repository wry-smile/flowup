import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface FrameworkGallerySolidNodeProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type FrameworkGallerySolidNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof FrameworkGallerySolidNodeProperties
> &
  FrameworkGallerySolidNodeProperties

declare global {
  interface FrameworkGallerySolidNodeProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  type FrameworkGallerySolidNodeNodeDef = NodeDef & FrameworkGallerySolidNodeProperties

  type FrameworkGallerySolidNodeNode = Node & FrameworkGallerySolidNodeProperties

  type FrameworkGallerySolidNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof FrameworkGallerySolidNodeProperties
  > &
    FrameworkGallerySolidNodeProperties
}

export {}
