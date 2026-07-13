import type { Command } from 'commander'
import process from 'node:process'
import { hasArgvFlag, stripQuotes } from '../../share/paths'
import { runAssemble } from './impl'

export interface AssembleCommandOptions {
  cwd?: string
  config?: string
  output?: string
  name?: string
  version?: string
  description?: string
  author?: string
  license?: string
  packages?: string
  clean?: boolean
  skipBuild?: boolean
}

export function registerAssembleCommand(program: Command): void {
  program
    .command('assemble')
    .description('Assemble all flowup-built Node-RED nodes and plugins into one distributable package.')
    .option('--cwd <path>', 'Scan root, defaults to process.cwd()')
    .option('--config <path>', 'Path to flowup.config.ts (or .js/.mjs/.cjs)')
    .option('--output <path>', 'Output directory, defaults to dist/flowup-assemble')
    .option('--name <name>', 'Assembled package name, defaults to flowup-assemble')
    .option('--version <version>', 'Assembled package version, defaults to 1.0.0')
    .option('--description <text>', 'Assembled package description')
    .option('--author <author>', 'Assembled package author')
    .option('--license <license>', 'Assembled package license, defaults to MIT')
    .option('--packages <csv>', 'Only include selected packages by package name, folder name, or relative path')
    .option('--no-clean', 'Do not clean the output directory before assembling')
    .option('--skip-build', 'Use existing dist outputs and skip per-package build', false)
    .action(async (options: AssembleCommandOptions) => {
      try {
        await runAssemble(toAssembleOptions(options))
      }
      catch (error) {
        console.error('Assemble failed:', error)
        process.exit(1)
      }
    })
}

function toAssembleOptions(options: AssembleCommandOptions): AssembleCommandOptions {
  return {
    cwd: hasArgvFlag('--cwd')
      ? stripQuotes(options.cwd) as string
      : undefined,
    config: hasArgvFlag('--config')
      ? stripQuotes(options.config) as string
      : undefined,
    output: hasArgvFlag('--output')
      ? stripQuotes(options.output) as string
      : undefined,
    name: hasArgvFlag('--name')
      ? stripQuotes(options.name) as string
      : undefined,
    version: hasArgvFlag('--version')
      ? stripQuotes(options.version) as string
      : undefined,
    description: hasArgvFlag('--description')
      ? stripQuotes(options.description) as string
      : undefined,
    author: hasArgvFlag('--author')
      ? stripQuotes(options.author) as string
      : undefined,
    license: hasArgvFlag('--license')
      ? stripQuotes(options.license) as string
      : undefined,
    packages: hasArgvFlag('--packages')
      ? stripQuotes(options.packages) as string
      : undefined,
    clean: hasArgvFlag('--no-clean')
      ? false
      : undefined,
    skipBuild: hasArgvFlag('--skip-build')
      ? true
      : undefined,
  }
}
