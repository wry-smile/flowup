import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'

export interface FlowupGroupEntry {
  runtime: string
  client: string
  template: string
}

export function flowupGroupEntryPlugin(
  kind: 'runtime' | 'editor',
  group: 'nodes' | 'plugins',
  entries: FlowupGroupEntry[],
): Plugin {
  const id = `virtual:flowup-${kind}-${group}`
  const resolvedId = `\0${id}`
  const clients = new Set(entries.map(entry => entry.client))
  const hasUnoCSS =
    kind === 'editor' &&
    entries.some(entry => readFileSync(entry.client, 'utf8').includes('virtual:uno.css'))

  return {
    name: `flowup-${kind}-${group}-entry`,
    enforce: 'pre',
    resolveId(source) {
      if (source === id) return resolvedId
    },
    load(source) {
      if (source !== resolvedId) return

      if (kind === 'editor') {
        return [
          ...(hasUnoCSS ? ["import 'virtual:uno.css';"] : []),
          ...entries.map(entry => `import ${JSON.stringify(entry.client)};`),
        ].join('\n')
      }

      const imports = entries.map(
        (entry, index) => `import init${index} from ${JSON.stringify(entry.runtime)};`,
      )
      const registrations = entries.map((_, index) => `  init${index}(RED);`)
      return [...imports, 'export default function initGroup(RED) {', ...registrations, '}'].join(
        '\n',
      )
    },
    transform(source, file) {
      if (kind !== 'editor' || !clients.has(file)) return
      const code = source.replace(/import\s*['"]virtual:uno\.css['"]\s*;?/g, '')
      return code === source ? undefined : code
    },
  }
}
