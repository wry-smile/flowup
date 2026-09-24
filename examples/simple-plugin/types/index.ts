export interface SimplePluginProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type SimplePluginClientNodeProperties = SimplePluginProperties

declare global {
  interface SimplePluginProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  interface SimplePluginClientNodeProperties extends SimplePluginProperties {
  }
}

export {}
