import type { FrameworkGalleryPreactNodeProperties } from '../types'
import { createHydrateStore } from '@wry-smile/flowup/client'

export const store = createHydrateStore<FrameworkGalleryPreactNodeProperties>({ name: undefined })
