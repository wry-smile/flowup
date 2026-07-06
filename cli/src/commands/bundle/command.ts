import type { Command } from 'commander'
import type { BundleOptions } from './impl'
import process from 'node:process'
import { loadFlowupConfig } from '../../config/load'
import { bundleMonorepo } from './impl'

export function registerBundleCommand(program: Command): void {
  program
    .command('bundle')
    .description('Build all node-red packages in the workspace and assemble them into a meta package.')
    .option('--cwd <path>', 'Working directory, default process.cwd()')
    .option('--output <path>', 'Bundle output path, default dist/commonNodes/node-red-tp-built-in')
    .option('--name <name>', 'Bundle meta package name, default flowup-bundle')
    .option('--version <version>', 'Bundle meta package version, default 1.0.0')
    .option('--no-clean', 'Do not clean the output directory before bundling')
    .option('--install', 'Run pnpm install in the bundle output after bundling', false)
    .option('--skip-build', 'Skip the per-package build step (use existing dist/)', false)
    .action(async (options) => {
      try {
        const { config: flowupConfig } = await loadFlowupConfig(options.cwd ?? process.cwd())
        const result = await bundleMonorepo({
          rootDir: options.cwd,
          outputDir: options.output,
          name: options.name,
          version: options.version,
          clean: options.clean,
          install: options.install,
          skipBuild: options.skipBuild,
          flowupConfig,
        } satisfies BundleOptions)
        console.log(`Bundle written to: ${result.outputDir}`)
        console.log(`  ${result.packages.length} package(s) included.`)
      }
      catch (err) {
        console.error('Bundle failed:', err)
        process.exit(1)
      }
    })
}
