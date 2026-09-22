import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { findWorkspaceRoot, isInMonorepo } from './monorepo'

export interface FlowupPackageRecord {
  name: string
  dir: string
  relPath: string
  packageJson: FlowupPackageJson
  nodeRed: FlowupNodeRedField
  configFile: string
}

export interface ScanFlowupPackagesOptions {
  cwd?: string
  packages?: string[]
}

export interface ScanFlowupPackagesResult {
  rootDir: string
  packages: FlowupPackageRecord[]
  monorepo: boolean
}

export interface FlowupNodeRedField {
  scope?: string
  version?: string
  dependencies?: string[]
  nodes?: Record<string, string>
  plugins?: Record<string, string>
}

export interface FlowupPackageJson extends Record<string, unknown> {
  'name'?: string
  'version'?: string
  'description'?: string
  'author'?: string
  'license'?: string
  'keywords'?: string[]
  'dependencies'?: Record<string, string>
  'peerDependencies'?: Record<string, string>
  'optionalDependencies'?: Record<string, string>
  'node-red'?: FlowupNodeRedField
}

const FLOWUP_CONFIG_FILES = [
  'flowup.config.ts',
  'flowup.config.js',
  'flowup.config.mjs',
  'flowup.config.cjs',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
]

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.pnpm-store',
  '.turbo',
  '.vite',
  'coverage',
  'dist',
  'node_modules',
  'tmp',
])

export async function scanFlowupPackages(options: ScanFlowupPackagesOptions = {}): Promise<ScanFlowupPackagesResult> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const monorepo = await isInMonorepo(cwd)
  const rootDir = monorepo
    ? (await findWorkspaceRoot(cwd)) ?? cwd
    : cwd

  const records: FlowupPackageRecord[] = []
  await walkForFlowupPackages(rootDir, rootDir, records)

  const filtered = filterPackages(records, options.packages)
    .sort((left, right) => left.relPath.localeCompare(right.relPath))

  return {
    rootDir,
    packages: filtered,
    monorepo,
  }
}

async function walkForFlowupPackages(
  rootDir: string,
  currentDir: string,
  records: FlowupPackageRecord[],
): Promise<void> {
  if (IGNORED_DIR_NAMES.has(basename(currentDir)))
    return

  const packageJsonPath = resolve(currentDir, 'package.json')
  if (existsSync(packageJsonPath)) {
    const record = readFlowupPackageRecord(rootDir, currentDir, packageJsonPath)
    if (record)
      records.push(record)
  }

  const entries = await readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory())
      continue
    if (IGNORED_DIR_NAMES.has(entry.name))
      continue

    await walkForFlowupPackages(rootDir, resolve(currentDir, entry.name), records)
  }
}

function readFlowupPackageRecord(
  rootDir: string,
  packageDir: string,
  packageJsonPath: string,
): FlowupPackageRecord | null {
  const packageJson = readJsonFile(packageJsonPath)

  const nodeRed = packageJson['node-red']
  if (!isFlowupNodeRedField(nodeRed))
    return null

  if (!hasNodeRedEntries(nodeRed))
    return null

  const configFile = findFlowupConfigFile(packageDir)
  if (!configFile)
    return null

  const name = packageJson.name ?? basename(packageDir)

  return {
    name,
    dir: packageDir,
    relPath: normalizeRelativePath(relative(rootDir, packageDir)) || '.',
    packageJson,
    nodeRed,
    configFile,
  }
}

function findFlowupConfigFile(packageDir: string): string | null {
  for (const fileName of FLOWUP_CONFIG_FILES) {
    const filePath = resolve(packageDir, fileName)
    if (!existsSync(filePath))
      continue
    if (looksLikeFlowupConfig(filePath))
      return filePath
  }

  return null
}

function looksLikeFlowupConfig(filePath: string): boolean {
  try {
    const source = readFileSync(filePath, 'utf8')
    return source.includes('@wry-smile/flowup')
  }
  catch (error) {
    throw new Error(`Unable to read Flowup config candidate: ${filePath}`, { cause: error })
  }
}

function readJsonFile(filePath: string): FlowupPackageJson {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as FlowupPackageJson
  }
  catch (error) {
    throw new Error(`Unable to read package manifest: ${filePath}`, { cause: error })
  }
}

function isFlowupNodeRedField(value: unknown): value is FlowupNodeRedField {
  return typeof value === 'object' && value !== null
}

function hasNodeRedEntries(nodeRed: FlowupNodeRedField): boolean {
  return hasRecordEntries(nodeRed.nodes) || hasRecordEntries(nodeRed.plugins)
}

function hasRecordEntries(value: unknown): value is Record<string, string> {
  return typeof value === 'object'
    && value !== null
    && Object.keys(value).length > 0
}

function filterPackages(records: FlowupPackageRecord[], filters: string[] | undefined): FlowupPackageRecord[] {
  if (!filters?.length)
    return records

  const normalizedFilters = filters.map(normalizeRelativePath)
  const wanted = new Set(normalizedFilters)
  const matchedFilters = new Set<string>()
  const filtered = records.filter((record) => {
    const candidates = [record.name, record.relPath, basename(record.dir)]
    const matches = candidates.filter(candidate => wanted.has(candidate))
    for (const match of matches)
      matchedFilters.add(match)
    return matches.length > 0
  })

  const missingFilters = normalizedFilters.filter(filter => !matchedFilters.has(filter))
  if (missingFilters.length) {
    throw new Error(
      `Requested Flowup package(s) not found: ${missingFilters.join(', ')}`,
    )
  }

  return filtered
}

function normalizeRelativePath(filePath: string): string {
  return filePath.split(sep).join('/').replaceAll('\\', '/')
}
