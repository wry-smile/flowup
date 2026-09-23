import type { ChildProcess } from 'node:child_process'
import type { FSWatcher } from 'chokidar'
import type { FlowupConfig, FlowupNodeRedDevConfig } from '../../sdk/define-config'
import type { DevCommandOptions } from './command'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { watch } from 'chokidar'
import { loadConfigFromFile } from 'vite'
import { findViteConfig } from '../../share/monorepo'
import { runBuild } from '../build/impl'

const CHANGE_DELAY_MS = 250
const STOP_TIMEOUT_MS = 5000

interface PreviewSettings {
  args: string[]
  packageRoot: string
  userDir: string
  url: string
}

export async function runDev(options: DevCommandOptions = {}): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const configFile = options.config ? resolve(cwd, options.config) : await findViteConfig(cwd)
  if (!existsSync(configFile)) throw new Error(`Flowup config file not found: ${configFile}`)

  const initialConfig = await loadFlowupConfig(configFile)
  const packageRoot = resolve(dirname(configFile), initialConfig.root ?? '.')
  validateNodeRedConfig(initialConfig.nodeRed ?? {})
  resolveNodeRedEntry(packageRoot)
  const dist = await runBuild({ cwd, config: configFile, mode: 'all' })

  await new DevPreview(cwd, configFile, packageRoot, dist).start()
}

class DevPreview {
  private watcher: FSWatcher | undefined
  private child: ChildProcess | undefined
  private debounceTimer: NodeJS.Timeout | undefined
  private lastChange = 0
  private pending = false
  private building = false
  private closing = false
  private readonly ignoredUserDirs = new Set<string>()
  private complete!: () => void
  private fail!: (error: Error) => void

  constructor(
    private readonly cwd: string,
    private readonly configFile: string,
    private readonly packageRoot: string,
    private dist: string,
  ) {}

  async start(): Promise<void> {
    const done = new Promise<void>((resolveDone, rejectDone) => {
      this.complete = resolveDone
      this.fail = rejectDone
    })
    const settings = await resolvePreviewSettings(this.configFile, this.packageRoot, this.dist)
    this.ignoredUserDirs.add(settings.userDir)
    await prepareUserDir(settings.userDir)

    this.watcher = watch([this.packageRoot, this.configFile], {
      ignoreInitial: true,
      atomic: true,
      usePolling: true,
      interval: 500,
      ignored: path => this.shouldIgnore(path),
    })
    this.watcher.on('all', (event, path) => {
      if (event === 'add' || event === 'change' || event === 'unlink') this.scheduleBuild(path)
    })
    this.watcher.on('error', error => void this.shutdown(asError(error)))
    console.log(`Flowup watching: ${this.packageRoot}`)

    const onInterrupt = () => void this.shutdown()
    const onTerminate = () => void this.shutdown()
    process.on('SIGINT', onInterrupt)
    process.on('SIGTERM', onTerminate)
    try {
      this.startNodeRed(settings)
      await done
    } finally {
      process.off('SIGINT', onInterrupt)
      process.off('SIGTERM', onTerminate)
    }
  }

  private shouldIgnore(path: string): boolean {
    if (path === this.configFile || path === this.packageRoot) return false
    if (isInside(this.dist, path)) return true
    if ([...this.ignoredUserDirs].some(dir => isInside(dir, path))) return true
    const relativePath = relative(this.packageRoot, path)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) return false
    const outputTempPrefix = `.${basename(this.dist)}.flowup-`
    return relativePath
      .split(sep)
      .some(
        segment =>
          segment.startsWith(outputTempPrefix) ||
          ['node_modules', '.git', '.flowup', 'test', 'tests', 'coverage'].includes(segment),
      )
  }

  private scheduleBuild(path: string): void {
    if (this.closing || this.shouldIgnore(path)) return
    this.pending = true
    this.lastChange = Date.now()
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined
      if (!this.building) void this.rebuild()
    }, CHANGE_DELAY_MS)
  }

  private async waitForQuiet(): Promise<void> {
    while (!this.closing && Date.now() - this.lastChange < CHANGE_DELAY_MS)
      await new Promise(resolve => setTimeout(resolve, CHANGE_DELAY_MS))
  }

  private async rebuild(): Promise<void> {
    if (this.building || this.closing) return
    this.building = true
    try {
      while (this.pending && !this.closing) {
        this.pending = false
        console.log('Flowup rebuilding...')
        let nextDist: string
        try {
          nextDist = await runBuild({ cwd: this.cwd, config: this.configFile, mode: 'all' })
        } catch (error) {
          console.error('Flowup rebuild failed; keeping the current Node-RED preview:', error)
          await this.waitForQuiet()
          continue
        }

        this.dist = nextDist
        await this.waitForQuiet()
        if (this.pending || this.closing) continue

        let settings: PreviewSettings
        try {
          settings = await resolvePreviewSettings(this.configFile, this.packageRoot, this.dist)
          this.ignoredUserDirs.add(settings.userDir)
          await prepareUserDir(settings.userDir)
        } catch (error) {
          console.error('Node-RED preview configuration failed:', error)
          continue
        }

        await this.stopNodeRed()
        if (this.pending || this.closing) continue
        this.startNodeRed(settings)
      }
    } catch (error) {
      await this.shutdown(asError(error))
    } finally {
      this.building = false
      if (this.pending && !this.closing && !this.debounceTimer) void this.rebuild()
    }
  }

  private startNodeRed(settings: PreviewSettings): void {
    console.log(`Node-RED preview: ${settings.url}`)
    console.log(`Node-RED working directory: ${settings.packageRoot}`)
    console.log(`Node-RED userDir: ${settings.userDir}`)
    console.log(`Node-RED nodesDir: ${this.dist}`)
    const child = spawn(process.execPath, settings.args, {
      cwd: settings.packageRoot,
      stdio: 'inherit',
      shell: false,
    })
    this.child = child
    child.once('error', error => {
      if (this.child === child) void this.shutdown(error)
    })
    child.once('exit', (code, signal) => {
      if (this.child !== child || this.closing) return
      this.child = undefined
      if (signal === 'SIGINT' || signal === 'SIGTERM') void this.shutdown()
      else void this.shutdown(new Error(`Node-RED exited with ${signal ?? `code ${code}`}.`))
    })
  }

  private async stopNodeRed(): Promise<void> {
    const child = this.child
    this.child = undefined
    if (!child || child.exitCode !== null || child.signalCode !== null) return
    await new Promise<void>(resolveDone => {
      const timer = setTimeout(() => child.kill('SIGKILL'), STOP_TIMEOUT_MS)
      child.once('exit', () => {
        clearTimeout(timer)
        resolveDone()
      })
      if (child.exitCode !== null || child.signalCode !== null) {
        clearTimeout(timer)
        resolveDone()
      } else {
        child.kill('SIGTERM')
      }
    })
  }

  private async shutdown(error?: Error): Promise<void> {
    if (this.closing) return
    this.closing = true
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    await this.watcher?.close()
    await this.stopNodeRed()
    if (error) this.fail(error)
    else this.complete()
  }
}

async function loadFlowupConfig(configFile: string): Promise<FlowupConfig> {
  const loaded = await loadConfigFromFile(
    { command: 'build', mode: 'assemble', isSsrBuild: false, isPreview: false },
    configFile,
    dirname(configFile),
    'silent',
    undefined,
    'runner',
  )
  const flowup = (loaded?.config as { flowup?: FlowupConfig } | undefined)?.flowup
  if (!flowup) throw new Error('flowup dev requires a config created with defineConfig(...).')
  return flowup
}

async function resolvePreviewSettings(
  configFile: string,
  packageRoot: string,
  dist: string,
): Promise<PreviewSettings> {
  const flowup = await loadFlowupConfig(configFile)
  if (resolve(dirname(configFile), flowup.root ?? '.') !== packageRoot)
    throw new Error('Changing the Flowup root requires restarting flowup dev.')
  const nodeRed = flowup.nodeRed ?? {}
  validateNodeRedConfig(nodeRed)
  const redEntry = resolveNodeRedEntry(packageRoot)
  const coreNodesDir = dirname(createRequire(redEntry).resolve('@node-red/nodes'))
  const nodesIncludes = [...collectCoreNodeFileNames(coreNodesDir), basename(dist)]
  const userDir = resolve(packageRoot, nodeRed.userDir ?? '.flowup/node-red')
  const settingsFile = nodeRed.settingsFile
    ? resolve(dirname(configFile), nodeRed.settingsFile)
    : undefined
  if (settingsFile && !existsSync(settingsFile))
    throw new Error(`Node-RED settings file not found: ${settingsFile}`)
  if (isInside(dist, userDir))
    throw new Error('nodeRed.userDir must be outside the build output directory.')

  const args = [
    redEntry,
    '--userDir',
    userDir,
    '-D',
    `nodesDir=${JSON.stringify(dist)}`,
    '-D',
    `nodesIncludes=${JSON.stringify(nodesIncludes)}`,
  ]
  if (settingsFile) args.push('--settings', settingsFile)
  if (nodeRed.port !== undefined) args.push('--port', String(nodeRed.port))
  if (nodeRed.host) args.push('-D', `uiHost=${JSON.stringify(nodeRed.host)}`)
  if (nodeRed.safe) args.push('--safe')
  if (nodeRed.flowsFile) args.push(nodeRed.flowsFile)

  return {
    args,
    packageRoot,
    userDir,
    url: `http://${nodeRed.host ?? '127.0.0.1'}:${nodeRed.port ?? 1880}/`,
  }
}

function collectCoreNodeFileNames(root: string): string[] {
  const names = new Set<string>()
  const visit = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true })
    const entryNames = new Set(entries.map(entry => entry.name))
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!['node_modules', 'icons', 'locales', 'examples', 'test'].includes(entry.name))
          visit(join(dir, entry.name))
      } else if (entry.isFile() && /\.c?js$/.test(entry.name)) {
        const template = entry.name.replace(/\.c?js$/, '.html')
        if (entryNames.has(template)) names.add(entry.name)
      }
    }
  }
  visit(root)
  return [...names].sort()
}

function validateNodeRedConfig(config: FlowupNodeRedDevConfig): void {
  if (
    config.port !== undefined &&
    (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
  )
    throw new Error('nodeRed.port must be an integer from 1 to 65535.')
  if (config.flowsFile && (config.flowsFile.includes('/') || config.flowsFile.includes('\\')))
    throw new Error('nodeRed.flowsFile must be a file name inside userDir.')
}

function resolveNodeRedEntry(packageRoot: string): string {
  const require = createRequire(join(packageRoot, 'package.json'))
  try {
    return require.resolve('node-red/red.js')
  } catch {
    throw new Error(
      `Node-RED is not installed for ${packageRoot}. Add node-red as a devDependency.`,
    )
  }
}

async function prepareUserDir(userDir: string): Promise<void> {
  await mkdir(userDir, { recursive: true })
  const packageFile = join(userDir, 'package.json')
  try {
    await writeFile(
      packageFile,
      '{\n  "name": "flowup-node-red-preview",\n  "version": "1.0.0",\n  "private": true,\n  "type": "commonjs"\n}\n',
      {
        flag: 'wx',
      },
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }

  const packageJson = JSON.parse(await readFile(packageFile, 'utf8')) as { type?: unknown }
  if (packageJson.type === 'module') {
    throw new Error(
      `Node-RED userDir package.json must use CommonJS because Node-RED loads settings.js with require(): ${packageFile}`,
    )
  }
}

function isInside(parent: string, child: string): boolean {
  const relativePath = relative(parent, child)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
