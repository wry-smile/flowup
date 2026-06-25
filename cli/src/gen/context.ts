import type { LocaleCode } from './locale'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

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

/**
 * 探测当前 gen 调用上下文是不是在 monorepo 里 —— 从 startDir 向上找
 * pnpm-workspace.yaml,找到就认为是在 monorepo 内。
 *
 * 为什么不查 cli 自身的位置:
 * cli 可能被 `pnpm -F @wry-smile/flowup gen` 从 monorepo 根调,
 * 也可能被用户 `flowup gen` 从 /tmp 调 —— 关键不在 cli 在哪,在用户 cwd 在哪。
 *
 * 为什么不用 require('node:fs'):cli 是 ESM-only,require 在 ESM 下不可用。
 * 用顶层 import + 函数调用即可。
 */
export function isInMonorepo(startDir: string = process.cwd()): boolean {
  let dir = resolve(startDir)
  for (let i = 0; i < 6; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml')))
      return true
    const parent = dirname(dir)
    if (parent === dir)
      break
    dir = parent
  }
  return false
}
