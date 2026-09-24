import type { FrameworkGallerySolidNodeProperties } from '../types'
import { createHydrateStore } from '@wry-smile/flowup/client'

export const store = createHydrateStore<FrameworkGallerySolidNodeProperties>({ name: undefined })
