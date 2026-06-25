import type { LocaleCode } from './locale'

export interface TemplateContext {
  name: string // kebab-case, e.g. "my-special-node"
  properName: string // PascalCase, e.g. "MySpecialNode"
  locales: LocaleCode[]
  /**
   * @wry-smile/flowup 的版本字符串,模板渲染 package.json 时用。
   * monorepo 内 → "workspace:*";发布场景 → "^x.y.z"
   */
  flowupDep: string
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

export function createContext(
  name: string,
  locales: LocaleCode[],
  flowupDep: string,
): TemplateContext {
  return {
    name,
    properName: toProperCase(name),
    locales,
    flowupDep,
  }
}
