/**
 * 模板渲染上下文 + 上下文构造 + monorepo 探测。
 *
 * 关键设计:
 * - flowupVersion 只用于模板渲染时插入到 src/package.json,实际取值
 *   从 share/cli-pkg.ts:resolveCliVersion() 拿。
 * - flowupSpecifier 由 createContext 根据 inMonorepo 自动选 workspace:* vs ^x.y.z。
 * - vueVersion / tailwindVersion 是 hardcode 版本号常量,跟 pnpm catalog 同步。
 *   为什么不从 pnpm-workspace.yaml 读?因为发布到 npm 的 cli 包内不含
 *   pnpm-workspace.yaml,而 peer optional 的 @vitejs/plugin-vue /
 *   @tailwindcss/vite 在用户子包可能根本没装,无法从它们的 package.json 读。
 */

import type { LocaleCode } from './locale'
import { toProperCase } from '../../share/paths'

/**
 * 可选 vite 插件的版本号常量 —— 跟 catalog 保持一致。
 * catalog 升了这里也要同步改(由 cli 升级 commit 统一管理)。
 */
export const VITE_PLUGIN_VUE_VERSION = '6.0.7'
export const TAILWINDCSS_VITE_VERSION = '4.3.1'

export interface TemplateContext {
  name: string // kebab-case, e.g. "my-special-node"
  properName: string // PascalCase, e.g. "MySpecialNode"
  locales: LocaleCode[]
  /**
   * @wry-smile/flowup 的精确版本号(无 ^ 前缀),仅用于日志 / 调试。
   * 模板渲染 package.json 的 flowup 字段时用 {@link flowupSpecifier}。
   */
  flowupVersion: string
  /**
   * 模板渲染 package.json 时 `@wry-smile/flowup` 字段要用的字符串。
   *
   * - monorepo 上下文(向上能找到 pnpm-workspace.yaml 且 cli 是 workspace 成员):
   *   用 `workspace:*` —— pnpm workspace link 到本地 cli 源码,monorepo 内联调更顺。
   * - 单包上下文(用户独立 gen 出脚手架发布):用 `^${flowupVersion}` 精确 caret,
   *   从 npm registry 拉取,行为可预测。
   */
  flowupSpecifier: string
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

export interface CreateContextOptions {
  name: string
  locales: LocaleCode[]
  flowupVersion: string
  /**
   * 是否在 monorepo 上下文里 gen。
   * true → @wry-smile/flowup 用 workspace:*;
   * false → 用 ^${flowupVersion}。
   * 由 gen 调用方传入(createContext 本身不知道 cwd,需要调用方探测)。
   */
  inMonorepo?: boolean
  vue?: boolean
  tailwind?: boolean
}

export function createContext(opts: CreateContextOptions): TemplateContext {
  return {
    name: opts.name,
    properName: toProperCase(opts.name),
    locales: opts.locales,
    flowupVersion: opts.flowupVersion,
    flowupSpecifier: opts.inMonorepo
      ? 'workspace:*'
      : `^${opts.flowupVersion}`,
    vue: opts.vue ?? false,
    tailwind: opts.tailwind ?? false,
    vueVersion: VITE_PLUGIN_VUE_VERSION,
    tailwindVersion: TAILWINDCSS_VITE_VERSION,
  }
}
