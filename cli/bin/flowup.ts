#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import {
  buildEntry,
  bundleMonorepo,
  findPnpmWorkspace,
  findViteConfig,
  loadFlowupConfig,
  runGenerator,
  scanMonorepoPackages,
} from '../src/index.js'

// 解析 cli/package.json 的 version(tsx 跑源码时 = cli/,编译产物跑时 = dist/../)
function readCliVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, '..', 'package.json'),
    resolve(here, '..', '..', 'package.json'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const pkg = JSON.parse(readFileSync(p, 'utf-8')) as { version?: string }
        return pkg.version ?? '0.0.0'
      }
      catch {
        return '0.0.0'
      }
    }
  }
  return '0.0.0'
}

const program = new Command()

program
  .name('flowup')
  .description('CLI tool for building, generating, and bundling Node-RED custom nodes.')
  .version(readCliVersion())

// ============================================================
// build
// ============================================================
program
  .command('build')
  .description('Build a single node/plugin package (runtime + client + resources).')
  .option('--cwd <path>', 'Working directory, default process.cwd()')
  .option('--config <path>', 'Path to vite.config.ts, default findup from cwd')
  .option('--watch', 'Enable Vite watch mode', false)
  .option('--all', 'Build all node-red packages in the monorepo (pnpm workspace)', false)
  .option('--pkg <name...>', 'Build only the named package(s), repeatable')
  .option('--bundle', 'After build, also produce a meta package under dist/commonNodes/...', false)
  .option('--bundle-output <path>', 'Bundle output path, default dist/commonNodes/node-red-tp-built-in')
  .option('--bundle-name <name>', 'Bundle meta package name, default flowup-bundle')
  .option('--bundle-install', 'Run pnpm install in the bundle output after bundling', false)
  .action(async (options) => {
    try {
      // 加载 flowup.config
      const { config: flowupConfig } = await loadFlowupConfig(options.cwd ?? process.cwd())

      if (options.all) {
        // 批量 build: 扫 monorepo
        const wsPath = await findPnpmWorkspace(options.cwd ?? process.cwd())
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
          ? await (async () => {
            // 用户给的是相对路径的话,基于 cwd 解析
              const { resolve } = await import('node:path')
              return resolve(options.cwd ?? process.cwd(), options.config)
            })()
          : await findViteConfig(options.cwd ?? process.cwd())
        console.log(`Building with config: ${configPath}`)
        await buildEntry({
          configPath,
          cwd: options.cwd,
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
    catch (err) {
      console.error('Build failed:', err)
      process.exit(1)
    }
  })

// ============================================================
// gen
// ============================================================
program
  .command('gen')
  .description('Scaffold a new Node-RED node or plugin in the current directory (cd into target dir first).')
  .option('--type <type>', 'Type to generate: node or plugin', (v) => {
    if (v !== 'node' && v !== 'plugin')
      throw new Error(`--type must be "node" or "plugin", got "${v}"`)
    return v
  })
  .option('--name <name>', 'Name of the node or plugin (kebab-case)')
  .option('--locales <locales>', 'Comma-separated list of locales (e.g., en-US,zh-CN)')
  .option('--vue [bool]', 'Enable Vue (SFC) for the client UI (adds @vitejs/plugin-vue). Pass --vue=false to disable.', v => v !== 'false' && v !== 'no' && v !== '0')
  .option('--tailwind [bool]', 'Enable Tailwindcss (adds @tailwindcss/vite). Pass --tailwind=false to disable.', v => v !== 'false' && v !== 'no' && v !== '0')
  .option('--non-interactive', 'Error if any required option is missing instead of prompting', false)
  .action(async (options) => {
    try {
      // commander 的 option 不会传 undefined,只在 .action 里拿;但 .option() 默认 '.'
      // 这里把没传 --xxx 的情况变回 undefined,让 gen 决定是否走交互。
      // hasArg 要兼顾 `--flag` 和 `--flag=value` 两种写法(commander 15 都允许)。
      const hasArg = (flag: string) => process.argv.some(a => a === flag || a.startsWith(`${flag}=`))
      const stripQuotes = (s: unknown) => typeof s === 'string' ? s.replace(/^['"]|['"]$/g, '') : s
      const opts: import('../src/gen/index.js').GenOptions = {
        type: hasArg('--type') ? stripQuotes(options.type) as 'node' | 'plugin' : undefined,
        name: hasArg('--name') ? stripQuotes(options.name) as string : undefined,
        locales: hasArg('--locales')
          ? (typeof options.locales === 'string' ? options.locales : '').split(',').map((s: string) => s.trim()).filter(Boolean) as 'en-US'[] // LocaleCode[] 详细 cast 见 gen/locale.ts
          : undefined,
        vue: hasArg('--vue') ? !!options.vue : undefined,
        tailwind: hasArg('--tailwind') ? !!options.tailwind : undefined,
        nonInteractive: !!options.nonInteractive,
      }
      await runGenerator(opts)
    }
    catch (err) {
      console.error('Generator failed:', err)
      process.exit(1)
    }
  })

// ============================================================
// bundle
// ============================================================
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
      })
      console.log(`Bundle written to: ${result.outputDir}`)
      console.log(`  ${result.packages.length} package(s) included.`)
    }
    catch (err) {
      console.error('Bundle failed:', err)
      process.exit(1)
    }
  })

program.parse(process.argv)
