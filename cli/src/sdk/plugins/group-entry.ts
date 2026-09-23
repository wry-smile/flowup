import type { Plugin } from 'vite'

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

  return {
    name: `flowup-${kind}-${group}-entry`,
    resolveId(source) {
      if (source === id) return resolvedId
    },
    load(source) {
      if (source !== resolvedId) return

      if (kind === 'editor') {
        return entries.map(entry => `import ${JSON.stringify(entry.client)};`).join('\n')
      }

      const imports = entries.map(
        (entry, index) => `import init${index} from ${JSON.stringify(entry.runtime)};`,
      )
      const registrations = entries.map((_, index) => `  init${index}(RED);`)
      return [...imports, 'export default function initGroup(RED) {', ...registrations, '}'].join(
        '\n',
      )
    },
  }
}
