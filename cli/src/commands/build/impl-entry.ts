/**
 * buildEntry —— single package 一次 build 的核心实现。
 *
 * 4 步:
 * 1. runtime build (vite)
 * 2. client build (vite) + 把产物 HTML 落盘
 * 3. 资源约定拷贝(icons / resources / locales / public / README / LICENSE)
 * 4. 过滤产物 package.json
 *
 * 被 build / dev / bundle / bundleMonorepo 四个入口复用。
 */

import type { Rollup } from 'vite'
import type { DefineConfigOptions } from '../../build/define-config'
import type { FlowupConfig } from '../../config/types'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { build, loadConfigFromFile } from 'vite'
import { runResourceCopy } from '../../build/resource'
import { filterPackageJson } from '../../config/package-json'
import { findViteConfig } from '../../share/monorepo'

export interface BuildEntryOptions {
  /** 显式指定 vite.config 路径,优先于 findup */
  configPath?: string
  /** 显式指定 working dir,默认 process.cwd() */
  cwd?: string
  /** flowup.config 加载结果,会影响 package.json 过滤 */
  flowupConfig?: FlowupConfig | null
  /** watch 模式(给 impl 留口,目前未用) */
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

  const pkgDir = resolve(options.cwd ?? process.cwd())

  // 切到子包 cwd,让 defineClientConfig / defineRuntimeConfig 里的 process.cwd()
  // 拿到正确的子包根(否则 monorepo 根跑 --all 时找不到子包资源)
  const originalCwd = process.cwd()
  if (pkgDir !== originalCwd) {
    process.chdir(pkgDir)
  }

  try {
    // 1. runtime build
    await build(config.config.runtime)

    // 2. client build
    const clientConfig = config.config.client
    if (!clientConfig)
      throw new Error('Client config not found.')

    const result = (await build(clientConfig)) as Rollup.RollupOutput

    // Rollup asset.source 在 vite 8 + write:false 链路上不可靠
    // (plugin 在 generateBundle 阶段对 in-memory bundle 改了 source,
    // 但 vite 返回的 result.output 是 emitFile 的拷贝)。
    // 直接读 client/editor.html 原始 HTML,内容来源唯一可信。
    const scope = config.config.scope as string
    if (!scope)
      throw new Error('Scope is not defined in the client configuration.')

    const htmlAsset = result.output.find(
      (o): o is Rollup.OutputAsset => o.type === 'asset' && o.fileName.endsWith('.html'),
    )
    if (!htmlAsset) {
      console.warn('No HTML asset found in build output.')
    }
    else {
      const outPath = resolve(pkgDir, 'dist', `${scope}.html`)
      let htmlContent: string
      if (typeof htmlAsset.source === 'string' && !htmlAsset.source.startsWith('/')) {
        htmlContent = htmlAsset.source
      }
      else {
        const srcHtmlPath = resolve(pkgDir, 'client', 'editor.html')
        if (!existsSync(srcHtmlPath))
          throw new Error(`Client editor.html not found: ${srcHtmlPath}`)
        htmlContent = await readFile(srcHtmlPath, 'utf-8')
      }
      await writeFile(outPath, htmlContent)
    }

    // 3. 资源约定拷贝
    await runResourceCopy(pkgDir, config.config.copyTask, config.config.resources)

    // 4. 过滤 package.json
    const srcPkgPath = resolve(pkgDir, 'package.json')
    if (existsSync(srcPkgPath)) {
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
