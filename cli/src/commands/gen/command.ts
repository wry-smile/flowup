import type { Command } from 'commander'
import type { GenOptions } from './impl'
import process from 'node:process'
import { hasArgvFlag, parseBool, parseCsvList, stripQuotes } from '../../share/paths'
import { runGenerator } from './impl'
import { addMultiEntry, runAddEntryGenerator, runMultiPackageGenerator } from './multi'

export function registerGenCommand(program: Command): void {
  const gen = program.command('gen')
  gen
    .command('package [name]')
    .description('Create a package for multiple nodes and plugins')
    .action(async name => {
      try {
        await runMultiPackageGenerator(name)
      } catch (error) {
        console.error('Generator failed:', error)
        process.exitCode = 1
      }
    })

  gen
    .command('add [type] [name]')
    .description('Add a node or plugin to a generated multi-entry package')
    .option('--framework <framework>', 'vanilla, svelte, or vue')
    .option('--unocss', 'Import scoped UnoCSS in a Vue or Svelte entry')
    .action(async (type, name, options, command: Command) => {
      const parentOptions = command.parent?.opts() ?? {}
      try {
        const entry = {
          type,
          name,
          framework: parentOptions.framework ?? options.framework,
          locales: hasArgvFlag('--locales')
            ? (parseCsvList(parentOptions.locales as string | undefined) as GenOptions['locales'])
            : undefined,
          unocss:
            parentOptions.unocss === undefined
              ? options.unocss
              : (parseBool(parentOptions.unocss) ?? true),
        }
        if (type && name) await addMultiEntry(entry)
        else await runAddEntryGenerator(entry)
      } catch (error) {
        console.error('Generator failed:', error)
        process.exitCode = 1
      }
    })

  gen
    .description(
      'Interactively scaffold a single-entry or multi-entry Node-RED package, or add an entry.',
    )
    .option('--type <type>', 'Type to generate: node or plugin', value => {
      if (value !== 'node' && value !== 'plugin')
        throw new Error(`--type must be "node" or "plugin", got "${value}"`)
      return value
    })
    .option('--name <name>', 'Name of the node or plugin (kebab-case)')
    .option('--locales <locales>', 'Comma-separated list of locales (e.g., en-US,zh-CN)')
    .option('--framework <framework>', 'Client framework: vanilla, svelte, or vue', value => {
      if (value !== 'vanilla' && value !== 'svelte' && value !== 'vue')
        throw new Error(`--framework must be "vanilla", "svelte", or "vue", got "${value}"`)
      return value
    })
    .option(
      '--vue [bool]',
      'Deprecated compatibility option. Use --framework=vue or --framework=vanilla instead.',
      value => value,
    )
    .option(
      '--unocss [bool]',
      'Enable scoped UnoCSS for Svelte or Vue templates. Pass --unocss=false to disable.',
      value => value,
    )
    .option(
      '--non-interactive',
      'Error if any required option is missing instead of prompting',
      false,
    )
    .action(async options => {
      try {
        const resolved = toGenOptions(options)
        await runGenerator(resolved)
      } catch (error) {
        console.error('Generator failed:', error)
        process.exitCode = 1
      }
    })
}

function toGenOptions(options: Record<string, unknown>): GenOptions {
  return {
    type: hasArgvFlag('--type') ? (stripQuotes(options.type) as 'node' | 'plugin') : undefined,
    name: hasArgvFlag('--name') ? (stripQuotes(options.name) as string) : undefined,
    locales: hasArgvFlag('--locales')
      ? (parseCsvList(options.locales as string | undefined) as GenOptions['locales'])
      : undefined,
    framework: hasArgvFlag('--framework')
      ? (stripQuotes(options.framework) as GenOptions['framework'])
      : undefined,
    vue: hasArgvFlag('--vue')
      ? (() => {
          const raw = options.vue as string | undefined
          if (raw === undefined || raw === '' || raw === 'true') return true
          return parseBool(raw) ?? true
        })()
      : undefined,
    unocss: hasArgvFlag('--unocss')
      ? (() => {
          const raw = options.unocss as string | undefined
          if (raw === undefined || raw === '' || raw === 'true') return true
          return parseBool(raw) ?? true
        })()
      : undefined,
    nonInteractive: !!options.nonInteractive,
  }
}
