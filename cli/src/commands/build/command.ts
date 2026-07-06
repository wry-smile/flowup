/**
 * flowup build 命令的 commander 注册 + 派发逻辑。
 *
 * 三种模式:
 * 1. --watch(单包):启动持续 watch + rebuild
 * 2. --all(monorepo 批量):扫所有 node-red 子包,逐个 buildEntry
 * 3. 默认(单包一次性):buildEntry
 *
 * --bundle 是 build 完成后的可选额外步骤(跟 --all / 单包都能组合)。
 */

import type { Command } from 'commander'
import { resolve } from 'node:path'
import process from 'node:process'
import { loadFlowupConfig } from '../../config/load'
import { findPnpmWorkspace, findViteConfig, scanMonorepoPackages } from '../../share/monorepo'
import { bundleMonorepo } from '../bundle/impl'
import { runBuildWatch } from '../dev/impl-watch'
import { buildEntry } from './impl-entry'

export interface BuildCmdOptions {
  cwd?: string
  config?: string
  watch: boolean
  all: boolean
  pkg?: string[]
  bundle: boolean
  bundleOutput?: string
  bundleName?: string
  bundleInstall: boolean
}

export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build a single node/plugin package (runtime + client + resources). Use --watch to rebuild on file changes.')
    .option('--cwd <path>', 'Working directory, default process.cwd()')
    .option('--config <path>', 'Path to vite.config.ts, default findup from cwd')
    .option('--watch', 'Watch runtime/ + client/ + icons/ + resources/ + locales/ for changes and rebuild', false)
    .option('--all', 'Build all node-red packages in the monorepo (pnpm workspace)', false)
    .option('--pkg <name...>', 'Build only the named package(s), repeatable')
    .option('--bundle', 'After build, also produce a meta package under dist/commonNodes/...', false)
    .option('--bundle-output <path>', 'Bundle output path, default dist/commonNodes/node-red-tp-built-in')
    .option('--bundle-name <name>', 'Bundle meta package name, default flowup-bundle')
    .option('--bundle-install', 'Run pnpm install in the bundle output after bundling', false)
    .action(async (options: BuildCmdOptions) => {
      try {
        await runBuild(options)
      }
      catch (err) {
        console.error('Build failed:', err)
        process.exit(1)
      }
    })
}

async function runBuild(options: BuildCmdOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd()

  // --watch 模式:单包 watch(--watch + --all 组合不支持)
  if (options.watch && !options.all) {
    await runBuildWatch({
      cwd,
      configPath: options.config
        ? resolve(cwd, options.config)
        : undefined,
    })
    return
  }

  // 加载 flowup.config
  const { config: flowupConfig } = await loadFlowupConfig(cwd)

  if (options.all) {
    // 批量 build:扫 monorepo
    const wsPath = await findPnpmWorkspace(cwd)
    if (!wsPath) {
      throw new Error('--all requires a pnpm-workspace.yaml in or above the cwd.')
    }
    const rootDir = wsPath.replace(/pnpm-workspace\.yaml$/, '')
    const { packages } = await scanMonorepoPackages(rootDir, {
      rootDir,
      packages: flowupConfig?.bundle?.packages,
    })
    console.log(`Found ${packages.length} package(s) in workspace.`)
    for (const pkg of packages) {
      // --pkg 过滤
      if (options.pkg && options.pkg.length && !options.pkg.includes(pkg.name)) {
        continue
      }
      console.log(`\n→ Building ${pkg.name} (${pkg.relPath})`)
      await buildEntry({
        cwd: pkg.absPath,
        flowupConfig,
      })
    }
  }
  else {
    // 单包 build
    const configPath = options.config
      ? resolve(cwd, options.config)
      : await findViteConfig(cwd)
    console.log(`Building with config: ${configPath}`)
    await buildEntry({
      configPath,
      cwd,
      flowupConfig,
    })
  }

  if (options.bundle) {
    console.log('\n→ Bundling into meta package...')
    const result = await bundleMonorepo({
      outputDir: options.bundleOutput,
      name: options.bundleName,
      install: options.bundleInstall,
      flowupConfig,
      skipBuild: true, // 我们已经 build 过了
    })
    console.log(`Bundle written to: ${result.outputDir}`)
  }
}
