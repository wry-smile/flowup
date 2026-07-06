import type { Command } from 'commander'
import type { RunDevOptions } from './impl-dev'
import process from 'node:process'
import { runDev } from './impl-dev'

export function registerDevCommand(program: Command): void {
  program
    .command('dev')
    .description('Dev mode: build + watch + auto-restart Node-RED on file changes. Use for active node/plugin development.')
    .option('--cwd <path>', 'Working directory, default process.cwd()')
    .option('--node-red-port <port>', 'Port for node-red, default 1880', v => parseInt(v, 10))
    .option('--node-red-user-dir <path>', 'node-red user dir (settings/flows/credentials), default <cwd>/node-red-dev')
    .option('--node-red-bin <path>', 'node-red binary path, default lookup from PATH')
    .action(async (options) => {
      try {
        await runDev({
          cwd: options.cwd,
          nodeRedPort: options.nodeRedPort,
          nodeRedUserDir: options.nodeRedUserDir,
          nodeRedBin: options.nodeRedBin,
        } satisfies RunDevOptions)
      }
      catch (err) {
        console.error('Dev failed:', err)
        process.exit(1)
      }
    })
}
