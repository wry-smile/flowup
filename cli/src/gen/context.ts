import type { LocaleCode } from './locale'

export interface TemplateContext {
  name: string // kebab-case, e.g. "my-special-node"
  properName: string // PascalCase, e.g. "MySpecialNode"
  locales: LocaleCode[]
  /**
   * @wry-smile/flowup 的精确版本号(无 ^ 前缀),模板渲染 package.json 时用。
   * 所有场景(monorepo / 单包)都用这个版本,保证调试行为和发布行为完全一致。
   */
  flowupVersion: string
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
  flowupVersion: string,
): TemplateContext {
  return {
    name,
    properName: toProperCase(name),
    locales,
    flowupVersion,
  }
}
