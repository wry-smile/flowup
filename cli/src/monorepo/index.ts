import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { findUp } from 'find-up'
// js-yaml v5 改成 named exports only,不再有 default export
import * as yaml from 'js-yaml'

export interface WorkspacePackage {
  /** 相对 monorepo 根 */
  relPath: string
  /** 绝对路径 */
  absPath: string
  /** 子包 package.json */
  pkg: Record<string, unknown>
  /** 子包名 */
  name: string
}

export interface PnpmWorkspace {
  packages: string[]
}

/**
 * 从 startDir 向上找 pnpm-workspace.yaml。
 */
export async function findPnpmWorkspace(startDir: string = process.cwd()): Promise<string | null> {
  const found = await findUp('pnpm-workspace.yaml', { cwd: startDir, type: 'file' })
  return found ?? null
}

/**
 * 读取 pnpm-workspace.yaml 的 packages 列表。
 * 不引入额外的 yaml 解析依赖,直接手撸 yaml 简化版解析。
 * (我们只用 packages 字段,且都是字符串数组 / 嵌套数组)
 */
async function readPnpmWorkspace(filePath: string): Promise<string[]> {
  const raw = await readFile(filePath, 'utf-8')
  const parsed = yaml.load(raw) as PnpmWorkspace | null
  if (!parsed || !Array.isArray(parsed.packages))
    return []
  return parsed.packages
}

function isGlob(pattern: string): boolean {
  return /[*?![]/.test(pattern)
}

/**
 * 把 pnpm-workspace.yaml 的 glob 模式展开成实际存在的子包目录列表。
 * pnpm 的 glob 比较简单:支持 `**` 表示任意层级目录。
 * 不引入 picomatch,直接拿前缀路径(去掉 `/**` 段)开始 walk,
 * 凡是目录下有 package.json 的就当作候选。
 */
async function expandGlob(rootDir: string, pattern: string): Promise<string[]> {
  if (!isGlob(pattern))
    return existsSync(join(rootDir, pattern)) ? [pattern] : []

  // 拿 glob 模式里最后一个 `/**` 或 `/*` 之前的固定前缀作为 walk 起点
  // 例如 packages/nodes/** → 起点 packages/nodes
  // 例如 packages/*     → 起点 packages
  const parts = pattern.split('/')
  const prefixParts: string[] = []
  for (const p of parts) {
    if (isGlob(p))
      break
    prefixParts.push(p)
  }
  const startDir = join(rootDir, ...prefixParts)

  async function walk(dir: string, base: string): Promise<string[]> {
    const out: string[] = []
    let entries: { name: string, isDirectory: () => boolean }[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    }
    catch {
      return []
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.'))
        continue
      const rel = base ? `${base}/${e.name}` : e.name
      const abs = join(dir, e.name)
      if (e.isDirectory()) {
        out.push(...await walk(abs, rel))
      }
    }
    // 当前目录里如果有 package.json,就当作候选
    if (existsSync(join(dir, 'package.json'))) {
      out.push(base)
    }
    return out
  }

  return await walk(startDir, prefixParts.join('/'))
}

async function readPackageJson(dir: string): Promise<Record<string, unknown> | null> {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath))
    return null
  try {
    return JSON.parse(await readFile(pkgPath, 'utf-8'))
  }
  catch {
    return null
  }
}

export interface ScanOptions {
  /** monorepo 根,默认从 startDir 向上找 pnpm-workspace.yaml */
  rootDir?: string
  /** 自定义 packages glob,默认从 pnpm-workspace.yaml 读 */
  packages?: string[]
}

/**
 * 扫到但应当忽略的目录名(子包的 build 产物、依赖目录等)。
 * 这些目录里也有 package.json,不能被当成 workspace 包。
 */
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.turbo', '.next', '.cache'])

export async function scanMonorepoPackages(
  startDir: string = process.cwd(),
  options: ScanOptions = {},
): Promise<{ rootDir: string, packages: WorkspacePackage[] }> {
  let rootDir = options.rootDir
  if (!rootDir) {
    const ws = await findPnpmWorkspace(startDir)
    if (!ws)
      throw new Error('No pnpm-workspace.yaml found. Cannot scan monorepo packages.')
    rootDir = dirname(ws)
  }

  const globs = options.packages
    ?? await readPnpmWorkspace(join(rootDir, 'pnpm-workspace.yaml'))
    ?? []

  const out: WorkspacePackage[] = []
  for (const pattern of globs) {
    const relPaths = await expandGlob(rootDir, pattern)
    for (const rel of relPaths) {
      // 过滤掉 build 产物 / node_modules 等目录
      const segments = rel.split('/')
      if (segments.some(s => IGNORED_DIRS.has(s)))
        continue

      const abs = resolve(rootDir, rel)
      const pkg = await readPackageJson(abs)
      if (!pkg)
        continue
      // 只挑带 node-red 字段的(也就是 node / plugin 子包)
      if (!pkg['node-red'])
        continue
      out.push({
        relPath: rel,
        absPath: abs,
        pkg,
        name: (pkg.name as string) ?? rel,
      })
    }
  }
  return { rootDir, packages: out }
}

/**
 * 向上找最近的 vite.config.ts(js|mjs) 文件,支持 monorepo 子包 build。
 * 找不到就 fallback 到 cwd 拼路径(保留原行为)。
 */
export async function findViteConfig(startDir: string = process.cwd()): Promise<string> {
  const candidates = [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
    'vite.config.cjs',
  ]
  for (const name of candidates) {
    const found = await findUp(name, { cwd: startDir, type: 'file' })
    if (found)
      return found
  }
  // fallback: 拼 cwd
  return resolve(startDir, 'vite.config.ts')
}
