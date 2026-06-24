import type { ResourceDefaults } from '../config/types'
import type { CopyTask } from './plugins/copy-file.plugin'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildConventionCopyTasks } from './resource'

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
