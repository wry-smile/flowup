import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file.plugin'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Node-RED 节点的约定资源目录 / 文件。
 * 默认全部扫描并拷到 dist,用户可在 resources 关闭某项,或在 copyTask 里追加。
 */
const CONVENTION_DIRS = ['icons', 'resources', 'locales', 'public'] as const
const CONVENTION_FILES = ['README.md', 'LICENSE', 'LICENSE.md'] as const

export function buildConventionCopyTasks(
  cwd: string,
  resources: ResourceDefaults = {},
): CopyTask[] {
  const tasks: CopyTask[] = []

  // 1. 顶层 README / LICENSE 拷到 dist 根
  if (resources.readme !== false) {
    for (const name of CONVENTION_FILES) {
      const from = resolve(cwd, name)
      if (existsSync(from)) {
        tasks.push({ from, to: resolve(cwd, 'dist', name) })
      }
    }
  }

  // 2. 约定目录拷到 dist/<name>
  for (const dir of CONVENTION_DIRS) {
    if (resources[dir] === false)
      continue
    const from = resolve(cwd, dir)
    if (!existsSync(from))
      continue
    tasks.push({ from, to: resolve(cwd, 'dist', dir) })
  }

  return tasks
}
