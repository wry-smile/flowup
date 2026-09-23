import type { Command } from 'commander'
import process from 'node:process'
import { runDev } from './impl'

export interface DevCommandOptions {
  cwd?: string
  config?: string
}

export function registerDevCommand(program: Command): void {
  program
    .command('dev')
    .description('Build and watch the current Flowup package, restarting Node-RED after changes.')
    .option('--cwd <path>', 'Package directory, defaults to process.cwd()')
    .option('--config <path>', 'Path to flowup.config.ts (or another supported config file)')
    .action(async (options: DevCommandOptions) => {
      try {
        await runDev(options)
      } catch (error) {
        console.error('Dev preview failed:', error)
        process.exitCode = 1
      }
    })
}
