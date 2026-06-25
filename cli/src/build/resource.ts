import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Node-RED 节点的约定资源目录 / 文件。
 * 默认全部扫描并拷到 dist,用户可在 resources 关闭某项,或在 copyTask 里追加。
 */
const CONVENTION_DIRS = ['icons', 'resources', 'locales', 'public'] as const
const CONVENTION_FILES = ['README.md', 'LICENSE', 'LICENSE.md'] as const

/**
 * 构造「约定目录/文件 → dist/」的拷贝任务列表。
 * 不实际执行拷贝,只生成任务;调用方负责执行。
 */
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

/**
 * 在 build 完成后兜底执行一次资源拷贝。
 * 之所以需要这个独立函数:在某些场景下(比如用户传 --watch 但只改资源文件、
 * 或者我们用 --all 批量 build),vite plugin 的 buildStart 不会重复触发。
 */
export async function runResourceCopy(
  cwd: string,
  userTasks: CopyTask[] = [],
  resources?: ResourceDefaults,
): Promise<void> {
  const tasks = [...buildConventionCopyTasks(cwd, resources), ...userTasks]
  for (const task of tasks) {
    const source = resolve(task.from)
    const destination = resolve(task.to)
    if (!existsSync(task.from)) {
      // 静默跳过,跟 vite plugin 行为一致;用户没文件不该报错
      continue
    }
    await cp(source, destination, { recursive: true, force: true })
  }
}
