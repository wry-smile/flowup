/**
 * node:fs.watch 的 debounce 包装。
 *
 * 抽出来是为了让 runBuildWatch / runDev 共用一套「建 watcher → 防抖 → 触发 rebuild」的循环。
 * 原 dev/index.ts 里嵌了两遍(debounce timer + building flag + 重建任务)。
 *
 * 设计要点:
 * - debounceMs 内多次触发只触发一次 handler(handler 自己负责异步串行)
 * - handler 返回 Promise 后,后面多次触发的防抖 reset 会再用最新路径调一次,
 *   handler 内部需要自己判断「正在 rebuild」并决定跳过 vs 还是 rebuild
 * - recursive 在某些 FS 上不支持(降级到 non-recursive)统一处理
 */

import type { FSWatcher } from 'node:fs'
import { existsSync, watch } from 'node:fs'
import process from 'node:process'

export interface DebouncedWatcher {
  /** 触发一次 rebuild(内部自动防抖) */
  trigger: (label: string) => void
  /** 关所有内部 watcher */
  close: () => void
}

export interface CreateDebouncedWatcherOptions {
  /**
   * 要 watch 的绝对路径列表(目录或文件);不存在的会被跳过。
   * 多用于「一组子目录」,每个 dir 单独建一个 watcher,事件触发时 caller
   * 会拿到「哪个目录被改了 + 哪个文件」(用 prefixPrefix 区分)。
   */
  watchPaths: string[]
  /**
   * 给每个 watch path 配一个 label prefix(比如 'runtime' / 'client')。
   * 一个触发事件被 caller 看到时,label = `${prefix}/${filename}`。
   * 不提供则只给 filename。
   */
  pathLabels?: string[]
  /** 防抖间隔 ms */
  debounceMs: number
  /** 触发一次 rebuild(label 是 `${prefix}/${filename}` 形式,给用户看的提示用) */
  onRebuild: (label: string) => Promise<void> | void
  /** 哪个 watch path 在降级到 non-recursive 时打 warning(可选) */
  onRecursiveUnsupported?: (path: string, reason: string) => void
  /**
   * 自定义日志 formatter:提供则打印一行 `prefix <label>`。
   * 不提供则不打(由 caller 决定要在 onRebuild 里打什么)。
   */
  logPrefix?: string
}

/**
 * 给一组 watchPaths 建 watcher,任一文件改动 → 防抖后调一次 onRebuild(label)。
 *
 * label 格式:相对 watch 根目录的文件路径(不带前导 /),没法拿到时降级 "(unknown)"。
 *
 * 注意:onRebuild 跑异步时,这期间再有新触发会被「新的 timer 替换旧的,等当前 rebuild
 * 跑完 + 防抖结束后再调一次」(由 caller 决定是否用 building flag 拦截)。
 */
export function createDebouncedWatcher(opts: CreateDebouncedWatcherOptions): DebouncedWatcher {
  const { watchPaths, pathLabels, debounceMs, onRebuild, onRecursiveUnsupported, logPrefix } = opts

  let timer: NodeJS.Timeout | null = null
  const trigger = (label: string) => {
    if (timer)
      clearTimeout(timer)
    if (logPrefix)
      console.log(`${logPrefix} ${label}`)
    timer = setTimeout(() => {
      timer = null
      Promise.resolve(onRebuild(label)).catch((err) => {
        console.error(`[flowup] watcher rebuild error:`, err)
      })
    }, debounceMs)
  }

  const watchers: FSWatcher[] = []
  for (let i = 0; i < watchPaths.length; i++) {
    const absPath = watchPaths[i]
    const label = pathLabels?.[i] ?? ''
    if (!existsSync(absPath))
      continue
    try {
      watchers.push(
        watch(absPath, { recursive: true }, (_event, filename) => {
          const file = filename ?? '(unknown)'
          trigger(label ? `${label}/${file}` : file)
        }),
      )
    }
    catch (err) {
      watchers.push(
        watch(absPath, (_event, filename) => {
          const file = filename ?? '(unknown)'
          trigger(label ? `${label}/${file}` : file)
        }),
      )
      if (onRecursiveUnsupported) {
        onRecursiveUnsupported(absPath, err instanceof Error ? err.message : String(err))
      }
    }
  }

  return {
    trigger,
    close: () => {
      if (timer)
        clearTimeout(timer)
      for (const w of watchers)
        w.close()
    },
  }
}

/**
 * 等一个 SIGINT/SIGTERM 信号再 resolve,典型跑命令的最后一行。
 */
export function waitForShutdownSignal(): Promise<void> {
  return new Promise<void>((resolve) => {
    const cleanup = () => resolve()
    process.once('SIGINT', cleanup)
    process.once('SIGTERM', cleanup)
  })
}
