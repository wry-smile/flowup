/**
 * 读取 cli 包自身的 package.json(tsx 跑源码时 = cli/,编译产物跑时 = dist/../)。
 *
 * 合并了之前散落的两个版本:
 * - bin/flowup.ts:readCliVersion —— 只要 version 字段
 * - gen/index.ts:resolveFlowupVersion —— 只要 version 字段(同一份逻辑)
 *
 * 统一用 readCliPackageJson() 拿完整对象,version 取 `.version` 即可。
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface CliPackageJson {
  name?: string
  version: string
}

const CLI_PKG_NAME = '@wry-smile/flowup'
const FALLBACK_VERSION = '0.0.0'

/**
 * 从 cli 包自身的 package.json 读 version,找不到就给 '0.0.0'。
 * 用 cli 包自身的位置(import.meta.url)向上找 package.json,
 * 兼容 tsx 直跑源 和 tsdown 编译后的 dist/ 两种情况。
 */
export function resolveCliVersion(): string {
  return readCliPackageJson().version
}

/**
 * 读 cli 包自身的 package.json 完整对象(主要是 name + version)。
 * 找不到 / 解析失败都给一个 fallback 对象,不抛 —— cli/bin 需要这个跑通。
 */
export function readCliPackageJson(): CliPackageJson {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, '..', 'package.json'),
    resolve(here, '..', '..', 'package.json'),
  ]
  for (const p of candidates) {
    if (!existsSync(p))
      continue
    try {
      const raw = JSON.parse(readFileSync(p, 'utf-8')) as { name?: string, version?: string }
      // 校验 name 是 cli 自己,避免读到一个同名父目录的 package.json
      if (raw.name === CLI_PKG_NAME)
        return { name: raw.name, version: raw.version ?? FALLBACK_VERSION }
    }
    catch {
      // 继续找下一个候选
    }
  }
  return { name: CLI_PKG_NAME, version: FALLBACK_VERSION }
}
