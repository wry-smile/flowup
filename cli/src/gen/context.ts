import type { LocaleCode } from './locale'

export interface TemplateContext {
  name: string // kebab-case, e.g. "my-special-node"
  properName: string // PascalCase, e.g. "MySpecialNode"
  locales: LocaleCode[]
}

export type FileMap = Record<string, string>

/**
 * 把任意字符串转成 PascalCase,用于 TS 类型/类名
 */
export function toProperCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('')
}

export function createContext(name: string, locales: LocaleCode[]): TemplateContext {
  return {
    name,
    properName: toProperCase(name),
    locales,
  }
}
