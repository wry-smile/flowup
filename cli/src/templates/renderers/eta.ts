import { Eta } from 'eta'

// Templates emit source files, so interpolated values must not be HTML-escaped
// and the indentation/newlines authored in .eta files should be preserved.
const eta = new Eta({ autoEscape: false, autoTrim: false })

export function renderEta<T extends Record<string, unknown>>(template: string, data: T): string {
  return eta.renderString(template, data)
}
