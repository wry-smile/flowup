import type { FlowupConfig } from './types'
import { existsSync } from 'node:fs'
import process from 'node:process'
// find-up v5 是 CJS,default export = findUp 函数本身
import findUp from 'find-up'

const CANDIDATE_NAMES = [
  'flowup.config.ts',
  'flowup.config.js',
  'flowup.config.mjs',
  'flowup.config.cjs',
]

/**
 * 从 startDir 开始向上找 flowup.config.* ,找到就 dynamic import 拿到 default export。
 *
 * 注意:dynamic import 在 ESM 上下文中支持加载 .ts,但需要在 node-loader / tsx / vite-node 等
 * 之一下运行。我们的 bin 是 tsdown 编译后的纯 ESM,所以只支持 .js / .mjs / .cjs。
 * .ts 配置需要用户跑在 tsx / node --experimental-strip-types 之类环境下。
 */
export async function loadFlowupConfig(
  startDir: string = process.cwd(),
): Promise<{ config: FlowupConfig | null, path: string | null }> {
  for (const name of CANDIDATE_NAMES) {
    const found = await findUp(name, { cwd: startDir, type: 'file' })
    if (!found)
      continue
    if (!existsSync(found))
      continue
    try {
      const mod = await import(found)
      const config: FlowupConfig = (mod.default ?? mod.config ?? mod) as FlowupConfig
      return { config, path: found }
    }
    catch (err) {
      throw new Error(
        `Failed to load flowup config at ${found}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }
  return { config: null, path: null }
}

export function defineConfig(config: FlowupConfig): FlowupConfig {
  return config
}
