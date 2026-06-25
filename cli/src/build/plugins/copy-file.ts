import type { Plugin } from 'vite'
import type { ResourceDefaults } from '../../config/types'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { buildConventionCopyTasks } from '../resource'

export interface CopyTask {
  /**
   * The source path to copy from.
   */
  from: string
  /**
   * The destination path to copy to.
   */
  to: string
}

export interface CopyPluginOptions {
  /**
   * An array of copy tasks to perform.
   */
  tasks: CopyTask[]
}

export interface ConventionCopyPluginOptions {
  /** 用户自定义 copy 任务,排在约定之后 */
  tasks?: CopyTask[]
  /** 资源约定开关,默认全开 */
  resources?: ResourceDefaults
}

/**
 * 资源约定 + 用户 copy 的 Vite 插件。
 * 约定部分(icons/resources/locales/public/README/LICENSE)在 buildStart 里基于
 * 当时 process.cwd() 解析,这样 monorepo 子包 build 时 process.chdir(pkgDir) 已生效,
 * 能正确扫到子包根下的资源。
 */
export function viteConventionCopyPlugin(options: ConventionCopyPluginOptions = {}): Plugin {
  const userTasks = options.tasks ?? []
  const resources = options.resources ?? {}
  return {
    name: 'vite-plugin-convention-copy',
    async buildStart() {
      const tasks: CopyTask[] = [
        ...buildConventionCopyTasks(process.cwd(), resources),
        ...userTasks,
      ]
      if (!tasks.length) {
        this.info('No copy tasks provided.')
        return
      }
      this.info(`Starting ${tasks.length} copy task(s)...`)
      for (const task of tasks) {
        if (!existsSync(task.from))
          continue
        try {
          await cp(resolve(task.from), resolve(task.to), { recursive: true, force: true })
          this.info(`Copied: ${task.from} -> ${task.to}`)
        }
        catch (error) {
          this.error(`Failed to copy: ${task.from} -> ${task.to}. Error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    },
  }
}

/**
 * 纯 copy plugin(无约定扫描),用绝对路径 tasks。
 * 留作兼容旧用法。
 */
export function viteCopyTaskPlugin(options: CopyPluginOptions): Plugin {
  const { tasks } = options
  return {
    name: 'vite-plugin-copy-task',
    async buildStart() {
      if (!tasks || tasks.length === 0) {
        this.warn('No copy tasks provided.')
        return
      }
      this.info(`Starting ${tasks.length} copy task(s)...`)
      for (const task of tasks) {
        const source = resolve(task.from)
        const destination = resolve(task.to)
        if (!existsSync(task.from))
          continue
        try {
          await cp(source, destination, { recursive: true, force: true })
          this.info(`Copied: ${source} -> ${destination}`)
        }
        catch (error) {
          this.error(`Failed to copy: ${source} -> ${destination}. Error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    },
  }
}
