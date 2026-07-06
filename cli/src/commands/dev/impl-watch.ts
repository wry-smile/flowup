/**
 * flowup build --watch 的实现:跑一次 buildEntry + 持续监听改动 rebuild。
 *
 * 设计:
 * - 用 share/fs-watch.ts:createDebouncedWatcher 把「防抖 + fs.watch + cleanup」抽掉
 * - 连续触发时:debounce timer 防连击,rebuild 期间再触发用 building flag 跳过(本次),
 *   build 完成后下次触发的 timer 会重新启动一次 rebuild
 */

import type { BuildEntryOptions } from '../build/impl-entry'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { loadFlowupConfig } from '../../config/load'
import { createDebouncedWatcher, waitForShutdownSignal } from '../../share/fs-watch'
import { buildEntry } from '../build/impl-entry'

/**
 * 默认 watch 子目录(相对子包根)。
 * 注意:不 watch `vite.config.ts` 本身(改了 vite.config 要手动重启 flowup,
 * 因为 buildEntry 启动时一次性 load config,热改 vite.config 不生效)。
 */
const DEFAULT_WATCH_DIRS = ['runtime', 'client', 'icons', 'resources', 'locales'] as const

export interface RunBuildWatchOptions extends BuildEntryOptions {
  /** 要 watch 的子目录列表,默认 DEFAULT_WATCH_DIRS */
  watchDirs?: readonly string[]
  /** debounce 间隔,默认 200ms */
  debounceMs?: number
  /** watch 启动前的提示 */
  onReady?: (pkgDir: string) => void
}

/**
 * 跑一次 buildEntry + 持续监听改动 rebuild,Ctrl+C 退出。
 */
export async function runBuildWatch(options: RunBuildWatchOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const watchDirs = options.watchDirs ?? DEFAULT_WATCH_DIRS
  const debounceMs = options.debounceMs ?? 200

  // 加载 flowup.config 用于 package.json 过滤等
  if (!options.flowupConfig) {
    options.flowupConfig = (await loadFlowupConfig(cwd)).config
  }

  // 首次 build(让用户在 watch 启动前先看到一次完整产物)
  await buildEntry(options)

  let building = false
  const ts = () => new Date().toISOString().slice(11, 19)

  const watcher = createDebouncedWatcher({
    watchPaths: watchDirs
      .map(dir => `${cwd}/${dir}`)
      .filter(p => existsSync(p)),
    pathLabels: watchDirs as unknown as string[],
    debounceMs,
    onRebuild: async (changedPath) => {
      if (building)
        return // 已有 build 在跑,本次跳过;下次触发会重新启动 rebuild
      building = true
      const stamp = ts()
      console.log(`\n[${stamp}] [flowup] File changed: ${changedPath}`)
      try {
        await buildEntry(options)
        console.log(`[${stamp}] [flowup] Rebuild OK`)
      }
      catch (err) {
        console.error(`[${stamp}] [flowup] Rebuild failed:`, err instanceof Error ? err.message : err)
      }
      finally {
        building = false
      }
    },
  })

  options.onReady?.(cwd)
  console.log(`[flowup] Watching ${cwd} (Ctrl+C to exit)`)

  await waitForShutdownSignal()
  watcher.close()
}
