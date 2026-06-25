import type { FileMap } from './context'
import type { LocaleCode } from './locale'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import { createContext } from './context'
import { DEFAULT_LOCALES, SUPPORTED_LOCALES } from './locale'
import { nodeTemplate } from './templates/node'
import { pluginTemplate } from './templates/plugin'

export type GenType = 'node' | 'plugin'

export interface GenOptions {
  /** 已显式提供的字段,全部提供时直接走非交互模式 */
  type?: GenType
  name?: string
  locales?: LocaleCode[]
  /** 强制走非交互,缺参就报错而不是弹 prompt */
  nonInteractive?: boolean
}

export interface GenResolved extends Required<Omit<GenOptions, 'nonInteractive'>> {}

function parseLocalesString(input: string | undefined): LocaleCode[] | undefined {
  if (!input)
    return undefined
  return input
    .split(',')
    .map(s => s.trim())
    .filter((s): s is LocaleCode => s in SUPPORTED_LOCALES)
}

function kebabCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 走 @clack/prompts 收集缺失字段。预先把 default 都用 env 来的值填好。
 */
async function collectMissing(options: GenOptions): Promise<GenResolved> {
  const answers: Partial<GenResolved> = {}

  if (options.type === undefined) {
    const ans = await p.select({
      message: 'What do you want to add?',
      options: [
        { value: 'node', label: 'Node' },
        { value: 'plugin', label: 'Plugin' },
      ],
      initialValue: 'node',
    })
    if (p.isCancel(ans)) {
      p.cancel('Cancelled by user.')
      process.exit(0)
    }
    answers.type = ans as GenType
  }
  else {
    answers.type = options.type
  }

  if (options.name === undefined) {
    const ans = await p.text({
      message: `Enter the ${answers.type} name (kebab-case)?`,
      defaultValue: '',
      placeholder: 'my-special-node',
      validate: (v) => {
        if (!v.trim())
          return 'Name is required'
        if (!/^[a-z][a-z0-9-]*$/.test(v.trim()))
          return 'Use kebab-case: lowercase letters, digits, dashes (must start with a letter)'
        return undefined
      },
    })
    if (p.isCancel(ans)) {
      p.cancel('Cancelled by user.')
      process.exit(0)
    }
    answers.name = kebabCase(ans)
  }
  else {
    answers.name = kebabCase(options.name)
  }

  if (options.locales === undefined) {
    const ans = await p.multiselect({
      message: 'Select internationalization locales?',
      options: Object.entries(SUPPORTED_LOCALES).map(([value, label]) => ({
        value: value as LocaleCode,
        label,
      })),
      initialValues: DEFAULT_LOCALES,
      required: false,
    })
    if (p.isCancel(ans)) {
      p.cancel('Cancelled by user.')
      process.exit(0)
    }
    answers.locales = ans as LocaleCode[]
  }
  else {
    answers.locales = options.locales
  }

  return answers as GenResolved
}

/**
 * 从 env / CLI 自动收集已提供的字段。
 * (兼容 gen 之前从 env 拿参数的旧用法,新用法直接传 options 即可)
 */
export function readOptionsFromEnv(): Partial<GenOptions> {
  return {
    type: process.env.FLOWUP_GEN_TYPE as GenType | undefined,
    name: process.env.FLOWUP_GEN_NAME,
    locales: parseLocalesString(process.env.FLOWUP_GEN_LOCALES),
  }
}

export async function runGenerator(rawOptions: GenOptions = {}): Promise<void> {
  // 合并 env + 显式参数
  const envOpts = readOptionsFromEnv()
  const options: GenOptions = {
    type: rawOptions.type ?? envOpts.type,
    name: rawOptions.name ?? envOpts.name,
    locales: rawOptions.locales ?? envOpts.locales,
    nonInteractive: rawOptions.nonInteractive,
  }

  // 校验
  if (options.type && options.type !== 'node' && options.type !== 'plugin') {
    throw new Error(`Invalid --type: ${options.type}. Must be "node" or "plugin".`)
  }
  if (options.name) {
    const k = kebabCase(options.name)
    if (k !== options.name) {
      p.log.warn(`Name normalized: ${options.name} → ${k}`)
      options.name = k
    }
  }
  if (options.locales) {
    const bad = options.locales.filter(l => !(l in SUPPORTED_LOCALES))
    if (bad.length) {
      throw new Error(`Invalid locales: ${bad.join(', ')}`)
    }
  }

  // 全部提供 → 直接走非交互(这是修复原 P0 #1 的关键)
  const allProvided = !!options.type && !!options.name && !!options.locales
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
    throw new Error(`Non-interactive mode requires: ${missing.join(', ')}`)
  }

  const resolved = await collectMissing(options)
  await doGenerate(resolved)
}

async function doGenerate(opts: GenResolved): Promise<void> {
  const flowupVersion = resolveFlowupVersion()
  const ctx = createContext(opts.name, opts.locales, flowupVersion)
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

/**
 * 读 cli/package.json 的 version,用精确版本号 "x.y.z" 形式返回。
 * 用 cli 包自身的位置向上找(tsx 跑源码时 = cli/,编译产物 = dist/../)。
 *
 * 为什么不用 workspace:* 或 ^x.y.z:
 * - workspace:* 让 monorepo 内的脚手架链接到本地 cli 源码,
 *   调试看到的行为可能跟用户装的发布版不一样,出现「我这能 work 你那边不行」的玄学 bug。
 * - ^x.y.z 允许自动 patch 升级,行为不完全可控。
 * - 精确版本号 x.y.z 保证 gen 出来的脚手架装的 cli 跟你测试时装的完全一致。
 */
export function resolveFlowupVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, '..', 'package.json'),
    resolve(here, '..', '..', 'package.json'),
  ]
  for (const p of candidates) {
    if (!existsSync(p))
      continue
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf-8')) as { name?: string, version?: string }
      if (pkg.name === '@wry-smile/flowup' && pkg.version)
        return pkg.version
    }
    catch {
      // 解析失败就跳过,继续找下一个候选
    }
  }
  return '0.0.0'
}
