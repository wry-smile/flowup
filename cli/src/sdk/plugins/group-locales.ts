import type { Plugin } from 'vite'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

export function flowupGroupLocalesPlugin(
  root: string,
  group: 'nodes' | 'plugins',
  name: string,
  entries: string[],
): Plugin {
  return {
    name: `flowup-${group}-locales`,
    apply: 'build',
    generateBundle() {
      const locales = new Set<string>()
      for (const entry of entries) {
        const directory = path.join(root, group, entry, 'locales')
        if (!existsSync(directory)) continue
        for (const locale of readdirSync(directory, { withFileTypes: true }))
          if (locale.isDirectory()) locales.add(locale.name)
      }

      for (const locale of locales) {
        const messages: Record<string, unknown> = {}
        const help: string[] = []
        for (const entry of entries) {
          const directory = path.join(root, group, entry, 'locales', locale)
          if (!existsSync(directory)) continue
          for (const file of readdirSync(directory).sort()) {
            const source = path.join(directory, file)
            if (file.endsWith('.json')) {
              const catalog = JSON.parse(readFileSync(source, 'utf8')) as Record<string, unknown>
              for (const [key, value] of Object.entries(catalog)) {
                if (Object.hasOwn(messages, key))
                  throw new Error(`Duplicate locale key ${key} in ${group}/${locale}`)
                messages[key] = value
              }
            } else if (file.endsWith('.html')) {
              help.push(readFileSync(source, 'utf8').trim())
            }
          }
        }
        if (Object.keys(messages).length)
          this.emitFile({
            type: 'asset',
            fileName: `locales/${locale}/${name}.json`,
            source: `${JSON.stringify(messages, null, 2)}\n`,
          })
        if (help.length)
          this.emitFile({
            type: 'asset',
            fileName: `locales/${locale}/${name}.html`,
            source: `${help.join('\n')}\n`,
          })
      }
    },
  }
}
