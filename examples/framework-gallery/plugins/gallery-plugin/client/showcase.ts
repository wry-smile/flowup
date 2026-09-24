import { resourceUrl as resolveResourceUrl } from '@client-shared/showcase'

export { features, tones } from '@client-shared/showcase'

export function resourceUrl(file: string): string {
  return resolveResourceUrl('gallery-plugin', file)
}
