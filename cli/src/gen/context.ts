import type { LocaleCode } from './locale'

/**
 * 可选 vite 插件的版本号常量 —— 跟 catalog 保持一致。
 *
 * 为什么 hardcode 而不是从 pnpm-workspace.yaml / cli/package.json 读:
 * 1. cli 发布到 npm 后,包内不会有 pnpm-workspace.yaml(它是 monorepo 配置)。
 * 2. cli 把 @vitejs/plugin-vue / @tailwindcss/vite 标为 peer optional,
 *    用户的 node_modules 里可能根本不存在这两个包,无法从它们的 package.json 读。
 * 3. 升级 catalog 时同步改这两个常量,跟 ctx.flowupVersion 思路一致 —— 由 cli 升级
 *    commit 统一管理,gen 出来的脚手架版本行为完全可预测。
 *
 * 当前值与 pnpm-workspace.yaml catalog 同步。catalog 改了这里也要改。
 */
export const VITE_PLUGIN_VUE_VERSION = '6.0.7'
export const TAILWINDCSS_VITE_VERSION = '4.3.1'

export interface TemplateContext {
  name: string // kebab-case, e.g. "my-special-node"
  properName: string // PascalCase, e.g. "MySpecialNode"
  locales: LocaleCode[]
  /**
   * @wry-smile/flowup 的精确版本号(无 ^ 前缀),模板渲染 package.json 时用。
   * 所有场景(monorepo / 单包)都用这个版本,保证调试行为和发布行为完全一致。
   */
  flowupVersion: string
  /**
   * 脚手架是否启用 Vue 客户端(@vitejs/plugin-vue)。
   * true 时:package.json 加 @vitejs/plugin-vue、vite.config.ts 自动 import + 注入 plugin。
   */
  vue: boolean
  /**
   * 脚手架是否启用 Tailwindcss(@tailwindcss/vite)。
   * true 时:同上,加 @tailwindcss/vite + 注入 plugin。
   */
  tailwind: boolean
  /** @vitejs/plugin-vue 的精确版本号(无 ^),从 catalog 同步 */
  vueVersion: string
  /** @tailwindcss/vite 的精确版本号(无 ^),从 catalog 同步 */
  tailwindVersion: string
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

export interface CreateContextOptions {
  name: string
  locales: LocaleCode[]
  flowupVersion: string
  vue?: boolean
  tailwind?: boolean
}

export function createContext(opts: CreateContextOptions): TemplateContext {
  return {
    name: opts.name,
    properName: toProperCase(opts.name),
    locales: opts.locales,
    flowupVersion: opts.flowupVersion,
    vue: opts.vue ?? false,
    tailwind: opts.tailwind ?? false,
    vueVersion: VITE_PLUGIN_VUE_VERSION,
    tailwindVersion: TAILWINDCSS_VITE_VERSION,
  }
}
