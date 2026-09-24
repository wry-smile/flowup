export const tones = [
  { label: 'Sky', className: 'bg-sky-100 text-sky-800 ring-sky-300' },
  { label: 'Emerald', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  { label: 'Violet', className: 'bg-violet-100 text-violet-800 ring-violet-300' },
] as const

export const features = ['Scoped utilities', 'Shared browser module', 'Node-RED hydration'] as const

export function resourceUrl(entry: string, file: string): string {
  return `resources/flowup-framework-gallery/${entry}/${file}`
}
