import type { ClientFramework, FileMap } from './context'
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
  type?: GenType
  name?: string
  locales?: LocaleCode[]
  framework?: ClientFramework
  vue?: boolean
  tailwind?: boolean
  nonInteractive?: boolean
}

export interface GenResolved extends Required<Omit<GenOptions, 'nonInteractive' | 'vue'>> {
  tailwind: boolean
}

export function readOptionsFromEnv(): Partial<GenOptions> {
  return {
    type: process.env.FLOWUP_GEN_TYPE as GenType | undefined,
    name: process.env.FLOWUP_GEN_NAME,
    locales: parseLocalesFromEnv(process.env.FLOWUP_GEN_LOCALES),
    framework: process.env.FLOWUP_GEN_FRAMEWORK as ClientFramework | undefined,
    vue: parseBool(process.env.FLOWUP_GEN_VUE),
    tailwind: parseBool(process.env.FLOWUP_GEN_TAILWIND),
  }
}

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
  const envOptions = readOptionsFromEnv()
  const options: GenOptions = {
    type: rawOptions.type ?? envOptions.type,
    name: rawOptions.name ?? envOptions.name,
    locales: rawOptions.locales ?? envOptions.locales,
    framework: rawOptions.framework ?? envOptions.framework,
    vue: rawOptions.vue ?? envOptions.vue,
    tailwind: rawOptions.tailwind ?? envOptions.tailwind,
    nonInteractive: rawOptions.nonInteractive,
  }

  if (!options.framework && options.vue !== undefined)
    options.framework = options.vue ? 'vue' : 'vanilla'

  if (options.framework && !['vanilla', 'svelte', 'vue'].includes(options.framework))
    throw new Error(`Invalid --framework: ${options.framework}. Must be "vanilla", "svelte", or "vue".`)

  if (options.type && options.type !== 'node' && options.type !== 'plugin')
    throw new Error(`Invalid --type: ${options.type}. Must be "node" or "plugin".`)

  if (options.locales) {
    const invalidLocales = options.locales.filter(locale => !(locale in SUPPORTED_LOCALES))
    if (invalidLocales.length)
      throw new Error(`Invalid locales: ${invalidLocales.join(', ')}`)
  }

  if (options.framework === 'vanilla')
    options.tailwind = false

  const allProvided = !!options.type && !!options.name && !!options.locales
    && options.framework !== undefined
    && (options.framework === 'vanilla' || options.tailwind !== undefined)
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
    if (options.framework === undefined)
      missing.push('--framework')
    if (options.framework && options.framework !== 'vanilla' && options.tailwind === undefined)
      missing.push('--tailwind')
    throw new Error(`Non-interactive mode requires: ${missing.join(', ')}`)
  }

  const resolved = await collectMissing(options)
  await doGenerate(resolved)
}

async function doGenerate(options: GenResolved): Promise<void> {
  const flowupVersion = resolveCliVersion()
  const inMonorepo = await isInMonorepo()
  const context = createContext({
    name: options.name,
    locales: options.locales,
    flowupVersion,
    inMonorepo,
    clientFramework: options.framework,
    vue: options.framework === 'vue',
    tailwind: options.tailwind,
  })

  const files: FileMap = options.type === 'node'
    ? nodeTemplate(context)
    : pluginTemplate(context)

  const baseDir = resolve(process.cwd(), options.name)
  if (existsSync(baseDir))
    throw new Error(`Target directory already exists: ${baseDir}`)

  const spinner = p.spinner()
  spinner.start(`Generating ${options.type} "${options.name}" at ${baseDir}`)

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = resolve(baseDir, relativePath)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, content, 'utf-8')
  }

  spinner.stop(`Generated ${Object.keys(files).length} files in ${baseDir}`)
  p.log.step('Next steps:')
  p.log.info(`  cd ${options.name}`)
  p.log.info('  pnpm install')
  p.log.info('  pnpm build')
}
