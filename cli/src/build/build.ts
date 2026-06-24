import type { Rollup } from 'vite'
import type { FlowupConfig } from '../config/types'
import type { DefineConfigOptions } from './define-config'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { build, loadConfigFromFile } from 'vite'
import { filterPackageJson } from '../config/package-json'
import { findViteConfig } from '../monorepo'
import { runResourceCopy } from './resource-runner'

export interface BuildEntryOptions {
  /** 显式指定 vite.config 路径,优先于 findup */
  configPath?: string
  /** 显式指定 working dir,默认 process.cwd() */
  cwd?: string
  /** flowup.config 加载结果,会影响 package.json 过滤 */
  flowupConfig?: FlowupConfig | null
  /** watch 模式,只跑一次 buildEntry 即可忽略 */
  watch?: boolean
}

export async function resolveConfigPath(options: BuildEntryOptions): Promise<string> {
  if (options.configPath)
    return resolve(options.configPath)
  return await findViteConfig(options.cwd ?? process.cwd())
}

async function loadConfig(configPath: string): Promise<{
  path: string
  config: DefineConfigOptions
  dependencies: string[]
} | null> {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }
  return loadConfigFromFile(
    { command: 'build', mode: 'production' },
    configPath,
  ) as Promise<{
    path: string
    config: DefineConfigOptions
    dependencies: string[]
  } | null>
}

export async function buildEntry(options: BuildEntryOptions = {}): Promise<void> {
  const configPath = await resolveConfigPath(options)
  const config = await loadConfig(configPath)
  if (!config)
    throw new Error(`Failed to load vite config: ${configPath}`)

  const pkgDir = options.cwd ?? process.cwd()

  // 切到子包 cwd,让 defineClientConfig / defineRuntimeConfig 里的 process.cwd()
  // 拿到正确的子包根(否则 monorepo 根跑 --all 时找不到子包资源)
  const originalCwd = process.cwd()
  if (pkgDir !== originalCwd) {
    process.chdir(pkgDir)
  }

  try {
    // 1. runtime build (root + chdir 已经处理 pkgDir 解析,outDir 保持相对 pkgDir)
    await build(config.config.runtime)

    // 2. client build
    const clientConfig = config.config.client
    if (!clientConfig)
      throw new Error('Client config not found.')

    const result = (await build(clientConfig)) as Rollup.RollupOutput

    const htmlAsset = result.output.find(
      (o): o is Rollup.OutputAsset => o.type === 'asset' && o.fileName.endsWith('.html'),
    )
    if (htmlAsset) {
      const scope = config.config.scope as string
      if (!scope)
        throw new Error('Scope is not defined in the client configuration.')
      const outPath = resolve(pkgDir, 'dist', `${scope}.html`)
      await writeFile(outPath, htmlAsset.source)
    }
    else {
      console.warn('No HTML asset found in build output.')
    }

    // 3. 资源约定拷贝(package.json / icons / resources / locales / public / README / LICENSE)
    //    client build 阶段的 viteCopyTaskPlugin 已经跑过,这里再补一次确保
    //    --watch / --bundle 等场景下用户自定义 copyTask 也跑一次。
    await runResourceCopy(pkgDir, config.config.copyTask, config.config.resources)

    // 4. 过滤 package.json
    const srcPkgPath = resolve(pkgDir, 'package.json')
    if (existsSync(srcPkgPath)) {
      const { readFile } = await import('node:fs/promises')
      const src = JSON.parse(await readFile(srcPkgPath, 'utf-8'))
      const filtered = filterPackageJson(src, options.flowupConfig?.packageJson)
      const outPkgPath = resolve(pkgDir, 'dist', 'package.json')
      await writeFile(outPkgPath, `${JSON.stringify(filtered, null, 2)}\n`)
    }
  }
  finally {
    if (pkgDir !== originalCwd) {
      process.chdir(originalCwd)
    }
  }
}
