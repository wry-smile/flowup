/**
 * 跨子命令共享的辅助工具 —— 纯函数,无副作用,纯 fs / path / object 操作。
 *
 * 命名规则:避免与 window / 全局函数撞名,内部 helper 都带语义后缀
 * (FromCache / ToCache / Cached 等)。对外 API 保留短名,只要用到就稳定。
 */

import process from 'node:process'

/**
 * kebab-case:任意字符串规范化为 a-z0-9- (开头结尾去 -)。
 * 给 gen 命令的 name 参数 / 子包名用。
 */
export function kebabCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * PascalCase:把 kebab / snake / 空格分隔转成 PascalCase。给 TS 类名 / 类型名用。
 */
export function toProperCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('')
}

/**
 * 解析 --locales 风格的逗号分隔字符串,过滤空白 + 空项。
 * 不在这里校验 locale 是否在白名单 —— 留给调用方(校验错误信息更精准)。
 */
export function parseCsvList(input: string | undefined | null): string[] | undefined {
  if (!input)
    return undefined
  const list = input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return list.length ? list : undefined
}

/**
 * 解析 boolean 环境变量 / CLI 选项。true/1/yes → true,false/0/no → false,其它(undefined / 空 / 乱填) → undefined。
 * undefined 表示「用户没传」,交给上游决定走默认值 vs 报错。
 */
export function parseBool(input: string | undefined | null): boolean | undefined {
  if (input === undefined || input === null)
    return undefined
  const v = input.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes')
    return true
  if (v === 'false' || v === '0' || v === 'no')
    return false
  return undefined
}

/**
 * 给 process.argv 找指定 flag 是否出现过(--flag 或 --flag=value 都算)。
 * commander 15 两种写法都允许,我们要兼容。
 */
export function hasArgvFlag(flag: string, argv: readonly string[] = process.argv): boolean {
  return argv.some(a => a === flag || a.startsWith(`${flag}=`))
}

/**
 * 去掉字符串首尾的单/双引号(gen 时 --name "my node" 这种情况)。
 */
export function stripQuotes(s: unknown): unknown {
  if (typeof s !== 'string')
    return s
  const t = s.trim()
  if (t.length >= 2) {
    const first = t.charAt(0)
    const last = t.charAt(t.length - 1)
    if ((first === '"' || first === '\'') && first === last)
      return t.slice(1, -1)
  }
  return s
}
