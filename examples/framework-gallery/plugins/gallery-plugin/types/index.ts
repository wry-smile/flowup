export interface FrameworkGalleryGalleryPluginProperties {
  name?: string
  framework: string
  mode: string
  enabled: boolean
  price: number
  quantity: number
  items: string[]
}

export type FrameworkGalleryGalleryPluginClientNodeProperties = FrameworkGalleryGalleryPluginProperties

declare global {
  interface FrameworkGalleryGalleryPluginProperties {
    name?: string
    framework: string
    mode: string
    enabled: boolean
    price: number
    quantity: number
    items: string[]
  }

  interface FrameworkGalleryGalleryPluginClientNodeProperties extends FrameworkGalleryGalleryPluginProperties {
  }
}

export {}
