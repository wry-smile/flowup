import type { Command } from 'commander'
import process from 'node:process'
import { runBuild } from './impl'

export interface BuildCommandOptions {
  cwd?: string
  config?: string
  mode?: 'all' | 'runtime' | 'editor'
}

export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build a Node-RED node or plugin using flowup.config.ts (or vite.config.ts) as the entry point.')
    .option('--cwd <path>', 'Working directory, defaults to process.cwd()')
    .option('--config <path>', 'Path to flowup.config.ts or vite.config.ts, defaults to find-up from cwd')
    .option('--mode <mode>', 'Build mode: runtime, editor, or all', 'all')
    .action(async (options: BuildCommandOptions) => {
      try {
        await runBuild(options)
      }
      catch (error) {
        console.error('Build failed:', error)
        process.exit(1)
      }
    })
}
