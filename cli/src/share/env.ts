/**
 * 跨子命令共享的环境变量 / 字符串解析工具 —— 之前散落在 gen/index.ts 的 parseLocalesString
 * 和 parseBool 提到这里来。
 */

import type { LocaleCode } from '../commands/gen/locale'
import { SUPPORTED_LOCALES } from '../commands/gen/locale'

/**
 * 解析逗号分隔 locale 字符串,过滤空白 + 校验在白名单里。
 * 返回 undefined 表示「用户没传」(命令需要走交互或报错)。
 */
export function parseLocalesString(input: string | undefined | null): LocaleCode[] | undefined {
  if (!input)
    return undefined
  const list = input
    .split(',')
    .map(s => s.trim())
    .filter((s): s is LocaleCode => s in SUPPORTED_LOCALES)
  return list.length ? list : undefined
}
