/**
 * flowup gen 主实现。
 *
 * 流程:
 * 1. 合并 env + 显式 options
 * 2. 校验
 * 3. 全部字段提供 → 走非交互;否则:
 *    - non-interactive → 报错列缺失字段
 *    - 否则 → collectMissing() 走 @clack 交互收集
 * 4. doGenerate() 写文件
 */

import type { FileMap } from './context'
import type { LocaleCode } from './locale'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import { resolveCliVersion } from '../../share/cli-pkg'
import { isInMonorepo } from '../../share/monorepo'
import { parseBool } from '../../share/paths'
import { nodeTemplate } from '../../templates/node'
import { pluginTemplate } from '../../templates/plugin'
import { collectMissing } from './collect'
import { createContext } from './context'
import { SUPPORTED_LOCALES } from './locale'

export type GenType = 'node' | 'plugin'

export interface GenOptions {
  /** 已显式提供的字段,全部提供时直接走非交互模式 */
  type?: GenType
  name?: string
  locales?: LocaleCode[]
  /**
   * 启用 Vue 客户端(@vitejs/plugin-vue)。
   * true 时脚手架自动装 @vitejs/plugin-vue 并注入 vite plugin。
   */
  vue?: boolean
  /**
   * 启用 Tailwindcss(@tailwindcss/vite)。
   * true 时脚手架自动装 @tailwindcss/vite 并注入 vite plugin。
   */
  tailwind?: boolean
  /** 强制走非交互,缺参就报错而不是弹 prompt */
  nonInteractive?: boolean
}

export interface GenResolved extends Required<Omit<GenOptions, 'nonInteractive' | 'vue' | 'tailwind'>> {
  vue: boolean
  tailwind: boolean
}

/**
 * 从 env 收集已经提供的字段。
 * (兼容 gen 之前从 env 拿参数的旧用法,新用法直接传 options 即可)
 */
export function readOptionsFromEnv(): Partial<GenOptions> {
  return {
    type: process.env.FLOWUP_GEN_TYPE as GenType | undefined,
    name: process.env.FLOWUP_GEN_NAME,
    locales: parseLocalesFromEnv(process.env.FLOWUP_GEN_LOCALES),
    vue: parseBool(process.env.FLOWUP_GEN_VUE),
    tailwind: parseBool(process.env.FLOWUP_GEN_TAILWIND),
  }
}

/** env string → LocaleCode[],不在白名单的过滤 */
function parseLocalesFromEnv(input: string | undefined): LocaleCode[] | undefined {
  if (!input)
    return undefined
  const list = input
    .split(',')
    .map(s => s.trim())
    .filter((s): s is LocaleCode => s in SUPPORTED_LOCALES)
  return list.length ? list : undefined
}

export async function runGenerator(rawOptions: GenOptions = {}): Promise<void> {
  // 合并 env + 显式参数
  const envOpts = readOptionsFromEnv()
  const options: GenOptions = {
    type: rawOptions.type ?? envOpts.type,
    name: rawOptions.name ?? envOpts.name,
    locales: rawOptions.locales ?? envOpts.locales,
    vue: rawOptions.vue ?? envOpts.vue,
    tailwind: rawOptions.tailwind ?? envOpts.tailwind,
    nonInteractive: rawOptions.nonInteractive,
  }

  // 校验
  if (options.type && options.type !== 'node' && options.type !== 'plugin') {
    throw new Error(`Invalid --type: ${options.type}. Must be "node" or "plugin".`)
  }
  if (options.locales) {
    const bad = options.locales.filter(l => !(l in SUPPORTED_LOCALES))
    if (bad.length) {
      throw new Error(`Invalid locales: ${bad.join(', ')}`)
    }
  }

  // 全部提供 → 直接走非交互
  // vue / tailwind 是布尔选项,undefined 等同 false,不需要在 missing 列表里报。
  const allProvided = !!options.type && !!options.name && !!options.locales
    && options.vue !== undefined && options.tailwind !== undefined
  if (allProvided) {
    await doGenerate(options as GenResolved)
    return
  }

  if (options.nonInteractive) {
    const missing: string[] = []
    if (!options.type)
      missing.push('--type')
    if (!options.name)
      missing.push('--name')
    if (!options.locales)
      missing.push('--locales')
    if (options.vue === undefined)
      missing.push('--vue')
    if (options.tailwind === undefined)
      missing.push('--tailwind')
    throw new Error(`Non-interactive mode requires: ${missing.join(', ')}`)
  }

  const resolved = await collectMissing(options)
  await doGenerate(resolved)
}

async function doGenerate(opts: GenResolved): Promise<void> {
  const flowupVersion = resolveCliVersion()
  const inMonorepo = await isInMonorepo()
  const ctx = createContext({
    name: opts.name,
    locales: opts.locales,
    flowupVersion,
    inMonorepo,
    vue: opts.vue,
    tailwind: opts.tailwind,
  })
  const files: FileMap = opts.type === 'node' ? nodeTemplate(ctx) : pluginTemplate(ctx)

  const baseDir = resolve(process.cwd(), opts.name)
  if (existsSync(baseDir)) {
    throw new Error(`Target directory already exists: ${baseDir}`)
  }

  const spinner = p.spinner()
  spinner.start(`Generating ${opts.type} "${opts.name}" at ${baseDir}`)

  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(baseDir, rel)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, content, 'utf-8')
  }

  spinner.stop(`Generated ${Object.keys(files).length} files in ${baseDir}`)

  p.log.step('Next steps:')
  p.log.info(`  cd ${opts.name}`)
  p.log.info('  pnpm install')
  p.log.info('  pnpm build')
}
