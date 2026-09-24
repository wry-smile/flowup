import type { EditorNodeProperties, Node, NodeDef } from 'node-red'

export interface SimpleNodeProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type SimpleNodeClientNodeProperties = Omit<
  EditorNodeProperties,
  keyof SimpleNodeProperties
> &
  SimpleNodeProperties

declare global {
  interface SimpleNodeProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  type SimpleNodeNodeDef = NodeDef & SimpleNodeProperties

  type SimpleNodeNode = Node & SimpleNodeProperties

  type SimpleNodeClientNodeProperties = Omit<
    EditorNodeProperties,
    keyof SimpleNodeProperties
  > &
    SimpleNodeProperties
}

export {}
