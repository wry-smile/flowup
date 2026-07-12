import type { LocaleCode } from './locale'
import { toProperCase } from '../../share/paths'
export type ClientFramework = 'vanilla' | 'svelte' | 'vue'

export interface TemplateContext {
  name: string
  properName: string
  locales: LocaleCode[]
  flowupVersion: string
  flowupSpecifier: string
  clientFramework: ClientFramework
  vue: boolean
  svelte: boolean
  tailwind: boolean
}

export type FileMap = Record<string, string>

export interface CreateContextOptions {
  name: string
  locales: LocaleCode[]
  flowupVersion: string
  inMonorepo?: boolean
  clientFramework?: ClientFramework
  vue?: boolean
  tailwind?: boolean
}

export function createContext(opts: CreateContextOptions): TemplateContext {
  const clientFramework = opts.clientFramework ?? (opts.vue ? 'vue' : 'vanilla')

  return {
    name: opts.name,
    properName: toProperCase(opts.name),
    locales: opts.locales,
    flowupVersion: opts.flowupVersion,
    flowupSpecifier: `^${opts.flowupVersion}`,
    clientFramework,
    vue: clientFramework === 'vue',
    svelte: clientFramework === 'svelte',
    tailwind: opts.tailwind ?? false,
  }
}
