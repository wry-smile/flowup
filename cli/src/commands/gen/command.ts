import type { Command } from 'commander'
import type { GenOptions } from './impl'
import process from 'node:process'
import { hasArgvFlag, parseBool, parseCsvList, stripQuotes } from '../../share/paths'
import { runGenerator } from './impl'

export function registerGenCommand(program: Command): void {
  program
    .command('gen')
    .description('Scaffold a new Node-RED node or plugin in the current directory (cd into target dir first).')
    .option('--type <type>', 'Type to generate: node or plugin', (value) => {
      if (value !== 'node' && value !== 'plugin')
        throw new Error(`--type must be "node" or "plugin", got "${value}"`)
      return value
    })
    .option('--name <name>', 'Name of the node or plugin (kebab-case)')
    .option('--locales <locales>', 'Comma-separated list of locales (e.g., en-US,zh-CN)')
    .option('--framework <framework>', 'Client framework: vanilla, svelte, or vue', (value) => {
      if (value !== 'vanilla' && value !== 'svelte' && value !== 'vue')
        throw new Error(`--framework must be "vanilla", "svelte", or "vue", got "${value}"`)
      return value
    })
    .option('--vue [bool]', 'Deprecated compatibility option. Use --framework=vue or --framework=vanilla instead.', value => value)
    .option('--tailwind [bool]', 'Enable Tailwindcss for Svelte or Vue templates. Pass --tailwind=false to disable.', value => value)
    .option('--non-interactive', 'Error if any required option is missing instead of prompting', false)
    .action(async (options) => {
      try {
        const resolved = toGenOptions(options)
        await runGenerator(resolved)
      }
      catch (error) {
        console.error('Generator failed:', error)
        process.exit(1)
      }
    })
}

function toGenOptions(options: Record<string, unknown>): GenOptions {
  return {
    type: hasArgvFlag('--type')
      ? stripQuotes(options.type) as 'node' | 'plugin'
      : undefined,
    name: hasArgvFlag('--name')
      ? stripQuotes(options.name) as string
      : undefined,
    locales: hasArgvFlag('--locales')
      ? parseCsvList(options.locales as string | undefined) as GenOptions['locales']
      : undefined,
    framework: hasArgvFlag('--framework')
      ? stripQuotes(options.framework) as GenOptions['framework']
      : undefined,
    vue: hasArgvFlag('--vue')
      ? (() => {
          const raw = options.vue as string | undefined
          if (raw === undefined || raw === '' || raw === 'true')
            return true
          return parseBool(raw) ?? true
        })()
      : undefined,
    tailwind: hasArgvFlag('--tailwind')
      ? (() => {
          const raw = options.tailwind as string | undefined
          if (raw === undefined || raw === '' || raw === 'true')
            return true
          return parseBool(raw) ?? true
        })()
      : undefined,
    nonInteractive: !!options.nonInteractive,
  }
}
