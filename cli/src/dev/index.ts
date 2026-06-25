/**
 * flowup dev / flowup build --watch 的实现。
 *
 * 设计目标:
 * - 文件改动 → 自动 rebuild 产物到 dist/(用户改完 Node-RED reload tab 就能看到)
 * - 额外启 node-red 子进程时,改动 runtime 触发 node-red 重启(client 改动不重启 node-red,
 *   因为 client 是浏览器侧,Node-RED reload tab 即可)
 * - 不引入 chokidar / nodemon 等新依赖,直接用 node:fs.watch(macOS/Linux 稳定)
 * - debounce 200ms 避免连击保存触发多次 build
 *
 * 为什么不直接用 vite createServer + server.watcher:
 * - createServer 启动耗时长(dep optimization + listen),只为拿 watcher 不划算
 * - vite 的 watcher 会 watch 全包(node_modules 也会被 watch,触发很多噪音事件)
 * - 我们要的只是几个特定子目录(runtime/ + client/ + icons/ + resources/ + locales/)
 */

import type { ChildProcess } from 'node:child_process'
import type { BuildEntryOptions } from '../build/index'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { buildEntry } from '../build/index'
import { loadFlowupConfig } from '../config'

/**
 * 默认要 watch 的子目录(相对子包根)。这些目录里的文件改动都会触发 rebuild。
 *
 * 注意:我们不 watch `vite.config.ts` 本身(改了 vite.config 要手动重启 flowup,
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

  // 启 fs.watch(macOS/Linux 稳定),debounce 后重 build
  let timer: NodeJS.Timeout | null = null
  let building = false
  const rebuild = async (changedFile: string) => {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(async () => {
      if (building)
        return // 已有 build 在跑,跳过这次(rebuild 期间再触发的会在 build 完成后被新的 timer 拦)
      building = true
      const ts = new Date().toISOString().slice(11, 19)
      console.log(`\n[${ts}] [flowup] File changed: ${changedFile}`)
      try {
        await buildEntry(options)
        console.log(`[${ts}] [flowup] Rebuild OK`)
      }
      catch (err) {
        console.error(`[${ts}] [flowup] Rebuild failed:`, err instanceof Error ? err.message : err)
      }
      finally {
        building = false
      }
    }, debounceMs)
  }

  const watchers: import('node:fs').FSWatcher[] = []
  for (const dir of watchDirs) {
    const abs = `${cwd}/${dir}`
    if (!existsSync(abs))
      continue
    try {
      const w = (await import('node:fs')).watch(abs, { recursive: true }, (_event, filename) => {
        rebuild(`${dir}/${filename ?? '(unknown)'}`)
      })
      watchers.push(w)
    }
    catch (err) {
      // recursive 在某些 FS 上不支持,降级到 non-recursive(子目录里改文件就不会 watch)
      const w = (await import('node:fs')).watch(abs, (_event, filename) => {
        rebuild(`${dir}/${filename ?? '(unknown)'}`)
      })
      watchers.push(w)
      console.warn(`[flowup] watch ${dir} recursive=false(${err instanceof Error ? err.message : err})`)
    }
  }

  options.onReady?.(cwd)
  console.log(`[flowup] Watching ${cwd} (Ctrl+C to exit)`)

  // 等 SIGINT / SIGTERM
  await new Promise<void>((resolve) => {
    const cleanup = () => {
      for (const w of watchers)
        w.close()
      resolve()
    }
    process.once('SIGINT', cleanup)
    process.once('SIGTERM', cleanup)
  })
}

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

/**
 * flowup dev —— 启动 vite build watch 模式 + node-red 子进程。
 *
 * 文件改动分两类处理:
 * - runtime/ 改动 → rebuild dist + 重启 node-red
 * - client/ 改动 → rebuild dist(产物落盘,用户在 Node-RED editor reload tab 看到新 bundle)
 * - 其他目录(icons/resources/locales) → rebuild dist,不需要重启 node-red
 *
 * 流程:
 * 1. 准备 node-red user dir(自动 mkdir)
 * 2. buildEntry 跑一次完整 build
 * 3. 启 node-red 子进程(node-red -u <user dir>)
 * 4. fs.watch 监听 runtime/ 改动 → kill + 重启 node-red
 * 5. fs.watch 监听 client/ + icons/ + resources/ + locales/ 改动 → rebuild dist
 * 6. Ctrl+C 退出,清理 node-red 子进程
 */
export async function runDev(options: RunDevOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const nodeRedUserDir = options.nodeRedUserDir ?? `${cwd}/node-red-dev`
  const nodeRedPort = options.nodeRedPort ?? 1880
  const watchDirs = options.watchDirs ?? DEFAULT_WATCH_DIRS
  const debounceMs = options.debounceMs ?? 200

  // 准备 user dir(放 flows_cred.json / nodes/)
  if (!existsSync(nodeRedUserDir))
    (await import('node:fs/promises')).mkdir(nodeRedUserDir, { recursive: true })

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
      nodeRed = spawn(bin, [
        '-u',
        nodeRedUserDir,
        '-p',
        String(nodeRedPort),
      ], {
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
    // spawn 是异步的,真正的 spawn 失败会通过 'error' 事件冒出来,
    // 必须挂 listener 否则会变 unhandled error 杀掉整个 process。
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

  // 监听 runtime 改动 → rebuild + 重启 node-red
  let runtimeTimer: NodeJS.Timeout | null = null
  let runtimeBuilding = false
  const rebuildAndRestart = async (changedFile: string) => {
    if (runtimeTimer)
      clearTimeout(runtimeTimer)
    runtimeTimer = setTimeout(async () => {
      if (runtimeBuilding)
        return
      runtimeBuilding = true
      const ts = new Date().toISOString().slice(11, 19)
      console.log(`\n[${ts}] [flowup] File changed: ${changedFile}`)
      try {
        await buildEntry(options)
        console.log(`[${ts}] [flowup] Rebuild OK → restarting node-red`)
        restartNodeRed()
      }
      catch (err) {
        console.error(`[${ts}] [flowup] Rebuild failed:`, err instanceof Error ? err.message : err)
      }
      finally {
        runtimeBuilding = false
      }
    }, debounceMs)
  }

  // 监听 client/icons/resources/locales 改动 → rebuild(不需要重启 node-red,
  // 因为 client 是浏览器侧,Node-RED reload tab 就能看到新 bundle)
  let clientTimer: NodeJS.Timeout | null = null
  let clientBuilding = false
  const rebuildOnly = async (changedFile: string) => {
    if (clientTimer)
      clearTimeout(clientTimer)
    clientTimer = setTimeout(async () => {
      if (clientBuilding)
        return
      clientBuilding = true
      const ts = new Date().toISOString().slice(11, 19)
      console.log(`\n[${ts}] [flowup] File changed: ${changedFile}`)
      try {
        await buildEntry(options)
        console.log(`[${ts}] [flowup] Rebuild OK (client/resources — open http://localhost:${nodeRedPort} and reload tab)`)
      }
      catch (err) {
        console.error(`[${ts}] [flowup] Rebuild failed:`, err instanceof Error ? err.message : err)
      }
      finally {
        clientBuilding = false
      }
    }, debounceMs)
  }

  const watchers: import('node:fs').FSWatcher[] = []
  const fsModule = await import('node:fs')
  for (const dir of watchDirs) {
    const abs = `${cwd}/${dir}`
    if (!existsSync(abs))
      continue
    const handler = dir === 'runtime' ? rebuildAndRestart : rebuildOnly
    try {
      watchers.push(fsModule.watch(abs, { recursive: true }, (_e, f) => handler(`${dir}/${f ?? '(unknown)'}`)))
    }
    catch {
      watchers.push(fsModule.watch(abs, (_e, f) => handler(`${dir}/${f ?? '(unknown)'}`)))
    }
  }

  console.log(`\n[flowup] dev mode active:`)
  console.log(`  - node-red URL: http://localhost:${nodeRedPort}`)
  console.log(`  - node-red user dir: ${nodeRedUserDir}`)
  console.log(`  - watching: ${watchDirs.join(', ')}`)
  console.log(`  - runtime changes → auto-restart node-red`)
  console.log(`  - client/icons/resources/locales changes → rebuild dist (reload tab)`)
  console.log(`  - Ctrl+C to exit\n`)

  await new Promise<void>((resolve) => {
    const cleanup = () => {
      for (const w of watchers)
        w.close()
      if (nodeRed) {
        try {
          nodeRed.kill('SIGTERM')
        }
        catch {}
      }
      resolve()
    }
    process.once('SIGINT', cleanup)
    process.once('SIGTERM', cleanup)
  })
}
