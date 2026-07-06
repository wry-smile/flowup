/**
 * flowup dev —— 跑 build + 启 node-red 子进程 + 文件改动自动重启。
 *
 * 与 runBuildWatch 的差别:
 * - runDev 多 spawn node-red 子进程
 * - file 改动分两类:
 *   - runtime 改动 → rebuild + 重启 node-red
 *   - client/icons/resources/locales 改动 → rebuild(浏览器 reload tab 即可,不需要重启 node-red)
 *
 * 两类触发合在一个 debounce watcher 里(同一个 watcher 回调里根据 dir 分类),
 * 不为这两类建两个独立 watcher(浪费 inode,fs.watch 在某些 FS 上 recursive 不支持,
 * 重复建两次更难处理降级)。
 */

import type { ChildProcess } from 'node:child_process'
import type { BuildEntryOptions } from '../build/impl-entry'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { loadFlowupConfig } from '../../config/load'
import { createDebouncedWatcher, waitForShutdownSignal } from '../../share/fs-watch'
import { buildEntry } from '../build/impl-entry'

const DEFAULT_WATCH_DIRS = ['runtime', 'client', 'icons', 'resources', 'locales'] as const

export interface RunDevOptions extends BuildEntryOptions {
  /** node-red 监听的端口,默认 1880 */
  nodeRedPort?: number
  /** node-red user dir,默认 ./node-red-dev/ */
  nodeRedUserDir?: string
  /** node-red 二进制路径,默认从 PATH 找 */
  nodeRedBin?: string
  /** watch 子目录 */
  watchDirs?: readonly string[]
  /** debounce 间隔 */
  debounceMs?: number
}

export async function runDev(options: RunDevOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const nodeRedUserDir = options.nodeRedUserDir ?? `${cwd}/node-red-dev`
  const nodeRedPort = options.nodeRedPort ?? 1880
  const watchDirs = options.watchDirs ?? [...DEFAULT_WATCH_DIRS]
  const debounceMs = options.debounceMs ?? 200

  // 准备 user dir(放 flows_cred.json / nodes/)
  if (!existsSync(nodeRedUserDir)) {
    const { mkdir } = await import('node:fs/promises')
    await mkdir(nodeRedUserDir, { recursive: true })
  }

  // 加载 flowup.config
  if (!options.flowupConfig) {
    options.flowupConfig = (await loadFlowupConfig(cwd)).config
  }

  // 首次 build
  await buildEntry(options)

  // 启 node-red 子进程
  let nodeRed: ChildProcess | null = null
  const restartNodeRed = () => {
    if (nodeRed) {
      try {
        nodeRed.kill('SIGTERM')
      }
      catch {}
      nodeRed = null
    }
    const bin = options.nodeRedBin ?? 'node-red'
    console.log(`\n[flowup] Starting node-red: ${bin} -u ${nodeRedUserDir} -p ${nodeRedPort}`)
    try {
      nodeRed = spawn(bin, ['-u', nodeRedUserDir, '-p', String(nodeRedPort)], {
        stdio: 'inherit',
        cwd,
      })
    }
    catch (err) {
      console.error(`[flowup] Failed to spawn ${bin}:`, err instanceof Error ? err.message : err)
      console.error(`[flowup] 安装方式: pnpm add -g node-red,或用 --node-red-bin 指定二进制路径`)
      nodeRed = null
      return
    }
    nodeRed.on('error', (err) => {
      console.error(`[flowup] node-red spawn error: ${err.message}`)
      console.error(`[flowup] 安装方式: pnpm add -g node-red,或用 --node-red-bin 指定二进制路径`)
      nodeRed = null
    })
    nodeRed.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      console.log(`[flowup] node-red exited (code=${code}, signal=${signal})`)
      nodeRed = null
    })
  }

  restartNodeRed()

  // 监听运行时(防连击 + 防并发 build)
  let building = false
  const ts = () => new Date().toISOString().slice(11, 19)

  // 用于判定本次触发要不要重启 node-red:
  // - runtime/ 改动 → 要重启(node 重启会读最新 runtime bundle)
  // - 其它(client/icons/resources/locales) → 不要重启(浏览器 reload tab 即可)
  let needsRestart = false

  const watcher = createDebouncedWatcher({
    watchPaths: watchDirs.map(dir => `${cwd}/${dir}`).filter(p => existsSync(p)),
    pathLabels: watchDirs as unknown as string[],
    debounceMs,
    onRebuild: async (changedPath) => {
      // changedPath 形如 'runtime/index.ts' / 'client/editor.html'
      // 取第一段作为子目录名判断
      const dir = changedPath.split('/')[0]
      const isRuntime = dir === 'runtime'
      if (isRuntime)
        needsRestart = true

      if (building)
        return
      building = true
      const stamp = ts()
      console.log(`\n[${stamp}] [flowup] File changed: ${changedPath}`)
      try {
        await buildEntry(options)
        if (needsRestart) {
          console.log(`[${stamp}] [flowup] Rebuild OK → restarting node-red`)
          restartNodeRed()
          needsRestart = false
        }
        else {
          console.log(`[${stamp}] [flowup] Rebuild OK (${dir}/ — open http://localhost:${nodeRedPort} and reload tab)`)
        }
      }
      catch (err) {
        console.error(`[${stamp}] [flowup] Rebuild failed:`, err instanceof Error ? err.message : err)
      }
      finally {
        building = false
      }
    },
  })

  console.log(`\n[flowup] dev mode active:`)
  console.log(`  - node-red URL: http://localhost:${nodeRedPort}`)
  console.log(`  - node-red user dir: ${nodeRedUserDir}`)
  console.log(`  - watching: ${watchDirs.join(', ')}`)
  console.log(`  - runtime changes → auto-restart node-red`)
  console.log(`  - client/icons/resources/locales changes → rebuild dist (reload tab)`)
  console.log(`  - Ctrl+C to exit\n`)

  await waitForShutdownSignal()
  watcher.close()
  if (nodeRed !== null) {
    try {
      (nodeRed as ChildProcess).kill('SIGTERM')
    }
    catch {}
  }
}
